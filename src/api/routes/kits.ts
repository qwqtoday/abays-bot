import { FastifyInstance } from 'fastify';
import { db } from '../../db/index.js';
import { kits, type Kit, type NewKit } from '../../db/schema.js';
import { v4 as uuid } from 'uuid';
import { eq } from 'drizzle-orm';
import { createLogger } from '../../utils/logger.js';
import { createKitSchema, updateKitSchema, type CreateKitInput, type UpdateKitInput } from '../schemas/index.js';

const log = createLogger('api:routes:kits');

export async function kitRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    '/kits',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const allKits = await db.select().from(kits);
      reply.send(allKits);
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/kits/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      const result = await db.select().from(kits).where(eq(kits.id, id)).limit(1);
      const kit = result[0];

      if (!kit) {
        reply.code(404).send({ error: 'Kit not found' });
        return;
      }

      reply.send(kit);
    }
  );

  fastify.post<{ Body: CreateKitInput }>(
    '/kits',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
      schema: {
        body: {
          type: 'object',
          required: ['name', 'homeName', 'chestX', 'chestY', 'chestZ'],
          properties: {
            name: { type: 'string' },
            homeName: { type: 'string' },
            chestX: { type: 'number' },
            chestY: { type: 'number' },
            chestZ: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const data = createKitSchema.parse(request.body);

      const newKit: NewKit = {
        id: uuid(),
        name: data.name,
        homeName: data.homeName,
        chestX: data.chestX,
        chestY: data.chestY,
        chestZ: data.chestZ,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(kits).values(newKit);

      log.info(`Created kit ${newKit.id}: ${newKit.name}`);

      reply.code(201).send(newKit);
    }
  );

  fastify.put<{ Params: { id: string }; Body: UpdateKitInput }>(
    '/kits/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
    },
    async (request, reply) => {
      const { id } = request.params;
      const data = updateKitSchema.parse(request.body);

      const existing = await db.select().from(kits).where(eq(kits.id, id)).limit(1);
      if (!existing[0]) {
        reply.code(404).send({ error: 'Kit not found' });
        return;
      }

      const updateData: Partial<Kit> = {
        ...data,
        updatedAt: new Date(),
      };

      await db.update(kits).set(updateData).where(eq(kits.id, id));

      const result = await db.select().from(kits).where(eq(kits.id, id)).limit(1);

      log.info(`Updated kit ${id}`);

      reply.send(result[0]);
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/kits/:id',
    {
      preHandler: [fastify.authenticate, fastify.requireAdmin],
    },
    async (request, reply) => {
      const { id } = request.params;

      const existing = await db.select().from(kits).where(eq(kits.id, id)).limit(1);
      if (!existing[0]) {
        reply.code(404).send({ error: 'Kit not found' });
        return;
      }

      await db.delete(kits).where(eq(kits.id, id));

      log.info(`Deleted kit ${id}`);

      reply.code(204).send();
    }
  );
}
