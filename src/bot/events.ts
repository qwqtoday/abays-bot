import { botManager } from './connection.js';
import { createLogger } from '../utils/logger.js';
import { EventEmitter } from 'events';

const log = createLogger('bot:events');

export class EventManager extends EventEmitter {
  constructor() {
    super();
    this.setupListeners();
  }

  private setupListeners(): void {
    botManager.on('chat', (username: string, message: string) => {
      this.emit('chat', { username, message });
    });

    botManager.on('spawn', () => {
      log.info('Bot spawned event received');
      this.emit('bot-spawn');
    });

    botManager.on('connected', () => {
      log.info('Bot connected event received');
      this.emit('bot-ready');
    });

    botManager.on('disconnected', (reason: string) => {
      log.warn(`Bot disconnected: ${reason}`);
      this.emit('bot-disconnected', reason);
    });
  }
}

export const eventManager = new EventManager();