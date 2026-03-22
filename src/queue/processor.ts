import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';
import { deliveryService } from '../bot/delivery.js';
import { botManager } from '../bot/connection.js';
import { startWorker, stopWorker, isWorkerRunning, type Job, type DeliveryJobData } from './index.js';

const log = createLogger('queue:processor');

export function initializeProcessor(): void {
  log.info('Initializing delivery processor...');

  startWorker(async (job: Job<DeliveryJobData>) => {
    const { orderId, kitId, playerName } = job.data;

    log.info(`Processing job ${job.id}: order ${orderId}, kit ${kitId}, player ${playerName}`);

    if (!botManager.isBotReady()) {
      log.warn('Bot not ready, waiting...');
      throw new Error('Bot is not ready, retrying later');
    }

    const result = await deliveryService.deliver(orderId, kitId, playerName);

    if (!result.success) {
      throw new Error(result.error ?? 'Delivery failed');
    }

    log.info(`Job ${job.id} completed successfully`);
  });

  log.info(`Queue worker initialized with concurrency: ${config.queue.concurrency}`);
}

export async function shutdownProcessor(): Promise<void> {
  await stopWorker();
}

export function isProcessorRunning(): boolean {
  return isWorkerRunning();
}