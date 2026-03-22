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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeHome(homeName: string): Promise<void> {
  const bot = getBot();
  log.info(`Executing /home ${homeName}`);

  const startPos = bot.entity.position.clone();
  bot.chat(`/home ${homeName}`);

  await sleep(2000);

  const endPos = bot.entity.position;
  const distance = Math.sqrt(
    Math.pow(endPos.x - startPos.x, 2) +
    Math.pow(endPos.y - startPos.y, 2) +
    Math.pow(endPos.z - startPos.z, 2)
  );

  if (distance > 10) {
    log.info(`Successfully teleported to home: ${homeName} (distance: ${distance.toFixed(1)})`);
  } else {
    log.info(`Executed /home ${homeName}, assuming teleport succeeded`);
  }
}

export async function executeTpa(playerName: string): Promise<void> {
  const bot = getBot();
  log.info(`Executing /tpa ${playerName}`);

  return new Promise((resolve, reject) => {
    const startPos = bot.entity.position.clone();
    let teleportDetected = false;

    const timeout = setTimeout(() => {
      bot.off('chat', chatHandler);
      if (!teleportDetected) {
        const endPos = bot.entity.position;
        const distance = Math.sqrt(
          Math.pow(endPos.x - startPos.x, 2) +
          Math.pow(endPos.y - startPos.y, 2) +
          Math.pow(endPos.z - startPos.z, 2)
        );

        if (distance > 10) {
          log.info(`TPA teleport detected via position (distance: ${distance.toFixed(1)})`);
          resolve();
        } else {
          reject(new CommandError(`TPA to ${playerName} timed out`));
        }
      }
    }, config.queue.tpaTimeoutMs);

    const chatHandler = (username: string, message: string) => {
      if (teleportDetected) return;
      
      const msg = message.toString().toLowerCase();
      
      if (msg.includes('teleporting')) {
        teleportDetected = true;
        clearTimeout(timeout);
        bot.off('chat', chatHandler);
        log.info(`TPA accepted by ${playerName}`);
        resolve();
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
    const respawnHandler = () => {
      bot.off('respawn', respawnHandler);
      log.info('Bot respawned at spawn point');
      resolve();
    };

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