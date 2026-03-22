import { botManager, Bot } from './connection.js';
import { createLogger } from '../utils/logger.js';
import { config } from '../config/index.js';

const log = createLogger('bot:commands');

export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CommandError';
  }
}

function getBot(): Bot {
  const bot = botManager.getBot();
  if (!bot) {
    throw new CommandError('Bot is not connected');
  }
  return bot;
}

export async function executeHome(homeName: string): Promise<void> {
  const bot = getBot();
  log.info(`Executing /home ${homeName}`);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      bot.off('chat', chatHandler);
      reject(new CommandError(`Timeout waiting for /home ${homeName}`));
    }, 10000);

    const chatHandler = (username: string, message: string) => {
      const msg = message.toString().toLowerCase();
      if (msg.includes('teleported') || msg.includes('welcome home') || msg.includes('home')) {
        clearTimeout(timeout);
        bot.off('chat', chatHandler);
        log.info(`Successfully teleported to home: ${homeName}`);
        resolve();
      }
      if (msg.includes('no home') || msg.includes('not found') || msg.includes("doesn't exist")) {
        clearTimeout(timeout);
        bot.off('chat', chatHandler);
        reject(new CommandError(`Home location "${homeName}" not found`));
      }
    };

    bot.on('chat', chatHandler);
    bot.chat(`/home ${homeName}`);
  });
}

export async function executeTpa(playerName: string): Promise<void> {
  const bot = getBot();
  log.info(`Executing /tpa ${playerName}`);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      bot.off('chat', chatHandler);
      reject(new CommandError(`Timeout waiting for /tpa ${playerName}`));
    }, config.queue.tpaTimeoutMs);

    const chatHandler = (username: string, message: string) => {
      const msg = message.toString().toLowerCase();
      if (
        msg.includes('teleport') &&
        (msg.includes('accept') || msg.includes('success') || msg.includes('teleported'))
      ) {
        clearTimeout(timeout);
        bot.off('chat', chatHandler);
        log.info(`TPA accepted by ${playerName}`);
        resolve();
      }
      if (msg.includes('request sent')) {
        log.debug(`TPA request sent to ${playerName}, waiting for acceptance...`);
      }
      if (
        msg.includes('not found') ||
        msg.includes('offline') ||
        msg.includes('denied') ||
        msg.includes('expired')
      ) {
        clearTimeout(timeout);
        bot.off('chat', chatHandler);
        reject(new CommandError(`TPA to ${playerName} failed: ${msg}`));
      }
    };

    bot.on('chat', chatHandler);
    bot.chat(`/tpa ${playerName}`);
  });
}

export async function executeKill(): Promise<void> {
  const bot = getBot();
  log.info('Executing /kill');

  return new Promise((resolve) => {
    const deathHandler = () => {
      bot.off('death', deathHandler);
      bot.off('respawn', respawnHandler);
    };

    const respawnHandler = () => {
      bot.off('death', deathHandler);
      bot.off('respawn', respawnHandler);
      log.info('Bot respawned at spawn point');
      resolve();
    };

    bot.on('death', deathHandler);
    bot.on('respawn', respawnHandler);
    bot.chat('/kill');
  });
}

export async function sendMessage(message: string): Promise<void> {
  const bot = getBot();
  bot.chat(message);
}

export function getPlayerPosition(): { x: number; y: number; z: number } | null {
  const bot = getBot();
  const pos = bot.entity.position;
  return {
    x: pos.x,
    y: pos.y,
    z: pos.z,
  };
}
