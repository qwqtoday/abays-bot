import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import staticPlugin from '@fastify/static';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';
import { authMiddleware, requireAdmin } from './middleware/auth.js';
import { authRoutes } from './routes/auth.js';
import { kitRoutes } from './routes/kits.js';
import { orderRoutes } from './routes/orders.js';
import { botManager } from '../bot/connection.js';
import { getQueueStats } from '../queue/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const log = createLogger('api');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '../../public');

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
    requireAdmin: (request: any, reply: any) => Promise<void>;
  }
}

export async function createApiServer() {
  const fastify = Fastify({
    logger: false,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });
  
  await fastify.register(cors, {
    origin: true,
  });

  await fastify.register(jwt, {
    secret: config.api.jwtSecret,
  });

  fastify.decorate('authenticate', authMiddleware);
  fastify.decorate('requireAdmin', requireAdmin);

  await fastify.register(authRoutes, { prefix: '/api' });
  await fastify.register(kitRoutes, { prefix: '/api' });
  await fastify.register(orderRoutes, { prefix: '/api' });

  fastify.get('/api/health', async (request, reply) => {
    reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  fastify.get('/api/ready', async (request, reply) => {
    const botReady = botManager.isBotReady();
    const queueStats = await getQueueStats();

    if (!botReady) {
      reply.code(503).send({
        status: 'not_ready',
        reason: 'Bot not connected',
        queue: queueStats,
      });
      return;
    }

    reply.send({
      status: 'ready',
      bot: botReady,
      queue: queueStats,
    });
  });

  await fastify.register(staticPlugin, {
    root: publicDir,
    prefix: '/',
    index: ['index.html'],
  });

  fastify.get('/', async (request, reply) => {
    return reply.sendFile('index.html');
  });

  fastify.get('/login', async (request, reply) => {
    return reply.sendFile('login.html');
  });

  fastify.get('/kits', async (request, reply) => {
    return reply.sendFile('kits.html');
  });

  fastify.get('/orders', async (request, reply) => {
    return reply.sendFile('orders.html');
  });

  fastify.get('/orders/new', async (request, reply) => {
    return reply.sendFile('new-order.html');
  });

  return fastify;
}

export async function startApiServer() {
  const fastify = await createApiServer();

  await fastify.listen({ port: config.api.port, host: '0.0.0.0' });

  log.info(`API server listening on port ${config.api.port}`);
  log.info(`Dashboard available at http://localhost:${config.api.port}/`);

  return fastify;
}