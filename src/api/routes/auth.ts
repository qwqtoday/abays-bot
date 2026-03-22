import { FastifyInstance } from 'fastify';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { createLogger } from '../../utils/logger.js';
import { loginSchema, type LoginInput } from '../schemas/index.js';
import { generateToken } from '../middleware/auth.js';

const log = createLogger('api:routes:auth');

interface CreateUserBody {
  username: string;
  password: string;
  role?: 'admin' | 'user';
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt_' + password.length);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: LoginInput }>(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { username, password } = loginSchema.parse(request.body);

      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      const user = result[0];

      if (!user) {
        log.debug(`Login failed: user ${username} not found`);
        reply.code(401).send({ error: 'Invalid credentials' });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        log.debug(`Login failed: invalid password for user ${username}`);
        reply.code(401).send({ error: 'Invalid credentials' });
        return;
      }

      const token = generateToken({ userId: user.id, role: user.role }, fastify.jwt);

      log.info(`User ${username} logged in successfully`);

      reply.send({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      });
    }
  );

  fastify.post<{ Body: CreateUserBody }>(
    '/register',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
    },
    async (request, reply) => {
      const { username, password, role = 'user' } = request.body;

      if (!username || !password) {
        reply.code(400).send({ error: 'Username and password required' });
        return;
      }

      const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
      if (existing[0]) {
        reply.code(409).send({ error: 'Username already exists' });
        return;
      }

      const passwordHash = await hashPassword(password);
      const userId = uuid();

      await db.insert(users).values({
        id: userId,
        username,
        passwordHash,
        role,
        createdAt: new Date(),
      });

      log.info(`Created user ${username} with role ${role}`);

      reply.code(201).send({
        id: userId,
        username,
        role,
      });
    }
  );
}
