import { createLogger } from '../utils/logger.js';
import { config } from '../config/index.js';

const log = createLogger('queue');

export interface DeliveryJobData {
  orderId: string;
  kitId: string;
  playerName: string;
}

interface Job<T> {
  id: string;
  name: string;
  data: T;
  attempts: number;
  status: 'waiting' | 'active' | 'completed' | 'failed';
}

class InMemoryQueue<T> {
  private jobs: Map<string, Job<T>> = new Map();
  private waitingQueue: string[] = [];
  private jobCounter = 0;

  async add(name: string, data: T): Promise<Job<T>> {
    const id = `${++this.jobCounter}`;
    const job: Job<T> = {
      id,
      name,
      data,
      attempts: 0,
      status: 'waiting',
    };
    this.jobs.set(id, job);
    this.waitingQueue.push(id);
    return job;
  }

  async getNext(): Promise<Job<T> | null> {
    const jobId = this.waitingQueue.shift();
    if (!jobId) return null;
    const job = this.jobs.get(jobId);
    if (!job) return null;
    job.status = 'active';
    return job;
  }

  async complete(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      job.status = 'completed';
    }
  }

  async fail(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      job.status = 'failed';
    }
  }

  async getWaitingCount(): Promise<number> {
    return this.waitingQueue.length;
  }

  async getActiveCount(): Promise<number> {
    return Array.from(this.jobs.values()).filter((j) => j.status === 'active').length;
  }

  async getCompletedCount(): Promise<number> {
    return Array.from(this.jobs.values()).filter((j) => j.status === 'completed').length;
  }

  async getFailedCount(): Promise<number> {
    return Array.from(this.jobs.values()).filter((j) => j.status === 'failed').length;
  }
}

class InMemoryWorker<T> {
  private handler: (job: Job<T>) => Promise<void>;
  private queue: InMemoryQueue<T>;
  private running = false;
  private concurrency: number;

  constructor(
    queue: InMemoryQueue<T>,
    handler: (job: Job<T>) => Promise<void>,
    options: { concurrency: number }
  ) {
    this.queue = queue;
    this.handler = handler;
    this.concurrency = options.concurrency;
  }

  async start(): Promise<void> {
    this.running = true;
    this.processLoop();
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  private async processLoop(): Promise<void> {
    while (this.running) {
      const job = await this.queue.getNext();
      if (job) {
        try {
          await this.handler(job);
          await this.queue.complete(job.id);
        } catch (error) {
          log.error(`Job ${job.id} failed: ${(error as Error).message}`);
          await this.queue.fail(job.id);
        }
      } else {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  isRunning(): boolean {
    return this.running;
  }
}

export const deliveryQueue = new InMemoryQueue<DeliveryJobData>();

let worker: InMemoryWorker<DeliveryJobData> | null = null;

log.info(`Delivery queue initialized with concurrency: ${config.queue.concurrency}`);

export async function addDeliveryJob(orderId: string, kitId: string, playerName: string): Promise<string> {
  const job = await deliveryQueue.add('deliver', {
    orderId,
    kitId,
    playerName,
  });

  log.info(`Added delivery job ${job.id} for order ${orderId}`);
  return job.id;
}

export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  const [waiting, active, completed, failed] = await Promise.all([
    deliveryQueue.getWaitingCount(),
    deliveryQueue.getActiveCount(),
    deliveryQueue.getCompletedCount(),
    deliveryQueue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

export function startWorker(handler: (job: Job<DeliveryJobData>) => Promise<void>): void {
  if (worker) {
    log.warn('Worker already running');
    return;
  }

  worker = new InMemoryWorker(deliveryQueue, handler, {
    concurrency: config.queue.concurrency,
  });

  worker.start();
  log.info(`Queue worker started with concurrency: ${config.queue.concurrency}`);
}

export async function stopWorker(): Promise<void> {
  if (worker) {
    await worker.stop();
    worker = null;
    log.info('Queue worker stopped');
  }
}

export function isWorkerRunning(): boolean {
  return worker?.isRunning() ?? false;
}

export type { Job };