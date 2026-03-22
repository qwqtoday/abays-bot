import { FastifyInstance } from 'fastify';
import { db } from '../../db/index.js';
import { orders, kits, type Order, type NewOrder } from '../../db/schema.js';
import { v4 as uuid } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { createLogger } from '../../utils/logger.js';
import { addDeliveryJob, getQueueStats } from '../../queue/index.js';
import { createOrderSchema, type CreateOrderInput } from '../schemas/index.js';
import { botManager } from '../../bot/connection.js';

const log = createLogger('api:routes:orders');

export async function orderRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: CreateOrderInput }>(
    '/orders',
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['kitId', 'playerName'],
          properties: {
            kitId: { type: 'string' },
            playerName: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const data = createOrderSchema.parse(request.body);

      const kitResult = await db.select().from(kits).where(eq(kits.id, data.kitId)).limit(1);
      if (!kitResult[0]) {
        reply.code(404).send({ error: 'Kit not found' });
        return;
      }

      const orderId = uuid();
      const newOrder: NewOrder = {
        id: orderId,
        kitId: data.kitId,
        playerName: data.playerName,
        status: 'pending',
        createdAt: new Date(),
      };

      await db.insert(orders).values(newOrder);

      const jobId = await addDeliveryJob(orderId, data.kitId, data.playerName);

      await db.update(orders).set({ status: 'processing' }).where(eq(orders.id, orderId));

      log.info(`Created order ${orderId} for kit ${data.kitId} to player ${data.playerName}`);

      reply.code(201).send({
        id: orderId,
        kitId: data.kitId,
        playerName: data.playerName,
        status: 'processing',
        jobId,
        createdAt: newOrder.createdAt,
      });
    }
  );

  fastify.get(
    '/orders',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
      reply.send(allOrders);
    }
  );

  fastify.get<{ Params: { id: string } }>(
    '/orders/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      const order = result[0];

      if (!order) {
        reply.code(404).send({ error: 'Order not found' });
        return;
      }

      reply.send(order);
    }
  );

  fastify.get(
    '/orders/stats/queue',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const stats = await getQueueStats();
      reply.send(stats);
    }
  );

  fastify.get(
    '/status',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const stats = await getQueueStats();
      const botReady = botManager.isBotReady();

      reply.send({
        bot: {
          connected: botReady,
        },
        queue: stats,
      });
    }
  );
}
