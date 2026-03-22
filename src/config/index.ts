import { z } from 'zod';

const configSchema = z.object({
  mc: z.object({
    host: z.string().min(1),
    port: z.number().int().positive().default(25565),
    username: z.string().min(1),
    auth: z.enum(['microsoft', 'offline']).default('offline'),
  }),
  api: z.object({
    port: z.number().int().positive().default(3000),
    jwtSecret: z.string().min(32),
    jwtExpiry: z.string().default('15m'),
  }),
  queue: z.object({
    concurrency: z.number().int().positive().default(3),
    tpaTimeoutMs: z.number().int().positive().default(60000),
  }),
  database: z.object({
    path: z.string().default('./data/bot.db'),
  }),
  logging: z.object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  }),
});

export type Config = z.infer<typeof configSchema>;

function parseEnv(): Config {
  return configSchema.parse({
    mc: {
      host: process.env.MC_HOST,
      port: parseInt(process.env.MC_PORT || '25565', 10),
      username: process.env.MC_USERNAME,
      auth: (process.env.MC_AUTH as 'microsoft' | 'offline') || 'offline',
    },
    api: {
      port: parseInt(process.env.API_PORT || '3000', 10),
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiry: process.env.JWT_EXPIRY || '15m',
    },
    queue: {
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '3', 10),
      tpaTimeoutMs: parseInt(process.env.TPA_TIMEOUT_MS || '60000', 10),
    },
    database: {
      path: process.env.DATABASE_PATH || './data/bot.db',
    },
    logging: {
      level: (process.env.LOG_LEVEL as Config['logging']['level']) || 'info',
    },
  });
}

export const config = parseEnv();
