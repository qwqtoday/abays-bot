import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../../config/index.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('api:auth');

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userRole?: 'admin' | 'user';
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.slice(7);
    const decoded = request.server.jwt.verify(token) as { userId: string; role: string };

    request.userId = decoded.userId;
    request.userRole = decoded.role as 'admin' | 'user';
  } catch (error) {
    log.debug(`Auth failed: ${(error as Error).message}`);
    reply.code(401).send({ error: 'Invalid or expired token' });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (request.userRole !== 'admin') {
    reply.code(403).send({ error: 'Admin access required' });
  }
}

export function generateToken(payload: object, jwt: any): string {
  return jwt.sign(payload, { expiresIn: config.api.jwtExpiry });
}
