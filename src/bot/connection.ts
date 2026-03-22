import mineflayer from 'mineflayer';
import pathfinder from 'mineflayer-pathfinder';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';
import { EventEmitter } from 'events';

const log = createLogger('bot:connection');

export type Bot = mineflayer.Bot & {
  pathfinder: pathfinder.Pathfinder;
};

export interface BotEvents {
  connected: () => void;
  disconnected: (reason: string) => void;
  spawn: () => void;
  chat: (username: string, message: string) => void;
  teleportAccept: (playerName: string) => void;
  teleportRequest: (playerName: string) => void;
}

export class BotManager extends EventEmitter {
  private bot: Bot | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isReconnecting = false;
  private isReady = false;

  constructor() {
    super();
  }

  async connect(): Promise<Bot> {
    return new Promise((resolve, reject) => {
      log.info(`Connecting to ${config.mc.host}:${config.mc.port} as ${config.mc.username}...`);

      const botOptions: mineflayer.BotOptions = {
        host: config.mc.host,
        port: config.mc.port,
        username: config.mc.username,
        password: config.mc.password,
        auth: config.mc.auth === 'online' ? 'microsoft' : 'offline',
      };

      const bot = mineflayer.createBot(botOptions) as Bot;

      bot.loadPlugin(pathfinder.pathfinder);

      bot.on('login', () => {
        log.info(`Logged in as ${bot.username}`);
        this.reconnectAttempts = 0;
        this.isReady = true;
        this.emit('connected');
      });

      bot.on('spawn', () => {
        log.info('Bot spawned');
        this.emit('spawn');
        resolve(bot);
      });

      bot.on('end', (reason: string) => {
        log.warn(`Connection ended: ${reason}`);
        this.isReady = false;
        this.emit('disconnected', reason);
        this.handleReconnect();
      });

      bot.on('kicked', (reason: string) => {
        log.error(`Kicked from server: ${reason}`);
        this.isReady = false;
        this.emit('disconnected', reason);
      });

      bot.on('error', (err: Error) => {
        log.error(`Bot error: ${err.message}`);
        if (!this.bot) {
          reject(err);
        }
      });

      bot.on('chat', (username: string, message: string) => {
        if (username === bot.username) return;
        this.emit('chat', username, message);
      });

      this.bot = bot;
    });
  }

  private async handleReconnect(): Promise<void> {
    if (this.isReconnecting) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      log.error(`Max reconnect attempts (${this.maxReconnectAttempts}) reached. Stopping.`);
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    log.info(`Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    await new Promise((r) => setTimeout(r, delay));

    try {
      await this.connect();
      log.info('Reconnected successfully');
    } catch (err) {
      log.error(`Reconnect failed: ${(err as Error).message}`);
    }

    this.isReconnecting = false;
  }

  getBot(): Bot | null {
    return this.bot;
  }

  isBotReady(): boolean {
    return this.isReady && this.bot !== null;
  }

  async disconnect(): Promise<void> {
    if (this.bot) {
      log.info('Disconnecting bot...');
      this.bot.quit();
      this.bot = null;
      this.isReady = false;
    }
  }
}

export const botManager = new BotManager();
