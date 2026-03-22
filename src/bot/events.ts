import { botManager } from './connection.js';
import { createLogger } from '../utils/logger.js';
import { EventEmitter } from 'events';

const log = createLogger('bot:events');

export interface TpaRequest {
  playerName: string;
  timestamp: Date;
  type: 'tpa' | 'tpahere';
}

export class EventManager extends EventEmitter {
  constructor() {
    super();
    this.setupListeners();
  }

  private setupListeners(): void {
    botManager.on('chat', (username: string, message: string) => {
      this.handleChat(username, message);
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

  private handleChat(username: string, message: string): void {
    const msg = message.toString().toLowerCase();

    if (msg.includes('wants to teleport') || msg.includes('has requested to teleport')) {
      log.info(`TPA request from ${username}`);
      this.emit('tpa-request', {
        playerName: username,
        timestamp: new Date(),
        type: 'tpa' as const,
      });
    }

    if (msg.includes('teleported to') || msg.includes('teleport successful')) {
      log.info(`Teleport successful`);
      this.emit('teleport-success');
    }

    if (msg.includes('teleport request denied') || msg.includes('denied your teleport')) {
      log.info(`Teleport denied`);
      this.emit('teleport-denied');
    }

    this.emit('chat', { username, message });
  }

  waitForTeleportAccept(timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.removeAllListeners('teleport-success');
        this.removeAllListeners('teleport-denied');
        resolve(false);
      }, timeoutMs);

      this.once('teleport-success', () => {
        clearTimeout(timeout);
        this.removeAllListeners('teleport-denied');
        resolve(true);
      });

      this.once('teleport-denied', () => {
        clearTimeout(timeout);
        this.removeAllListeners('teleport-success');
        resolve(false);
      });
    });
  }
}

export const eventManager = new EventManager();
