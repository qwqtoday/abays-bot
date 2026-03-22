import 'dotenv/config';
import { config } from './config/index.js';
import { createLogger } from './utils/logger.js';
import { botManager } from './bot/connection.js';
import { startApiServer } from './api/index.js';
import { initializeProcessor, shutdownProcessor } from './queue/processor.js';

const log = createLogger('main');

async function main() {
  log.info('Starting abays-bot...');

  try {
    log.info('Connecting to Minecraft server...');
    await botManager.connect();
    log.info('Bot connected successfully');

    log.info('Starting queue processor...');
    initializeProcessor();

    log.info('Starting API server...');
    await startApiServer();

    log.info('Bot is ready and running!');

    const shutdown = async (signal: string) => {
      log.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await shutdownProcessor();
        log.info('Queue processor stopped');
      } catch (err) {
        log.error(`Error stopping processor: ${(err as Error).message}`);
      }

      try {
        await botManager.disconnect();
        log.info('Bot disconnected');
      } catch (err) {
        log.error(`Error disconnecting bot: ${(err as Error).message}`);
      }

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
      log.error(`Uncaught exception: ${err.message}`);
      log.error(err.stack ?? '');
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      log.error(`Unhandled rejection: ${reason}`);
    });
  } catch (error) {
    log.error(`Failed to start: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();