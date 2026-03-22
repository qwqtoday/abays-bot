import { botManager, Bot } from './connection.js';
import { createLogger } from '../utils/logger.js';
import { Vec3 } from 'vec3';
import pathfinder from 'mineflayer-pathfinder';

const { goals } = pathfinder;

const log = createLogger('bot:chest');

export class ChestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChestError';
  }
}

export interface ChestItem {
  name: string;
  count: number;
  slot: number;
}

function getBot(): Bot {
  const bot = botManager.getBot();
  if (!bot) {
    throw new ChestError('Bot is not connected');
  }
  return bot;
}

export async function navigateToPosition(x: number, y: number, z: number): Promise<void> {
  const bot = getBot();
  log.info(`Navigating to (${x}, ${y}, ${z})`);

  const goal = new goals.GoalBlock(Math.floor(x), Math.floor(y), Math.floor(z));

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      bot.pathfinder.stop();
      reject(new ChestError('Navigation timeout'));
    }, 30000);

    bot.pathfinder.goto(goal, (err) => {
      clearTimeout(timeout);
      if (err) {
        log.error(`Navigation failed: ${err.message}`);
        reject(new ChestError(`Failed to navigate: ${err.message}`));
      } else {
        log.info('Navigation complete');
        resolve();
      }
    });
  });
}

export async function openChestAt(x: number, y: number, z: number): Promise<ChestItem[]> {
  const bot = getBot();
  log.info(`Opening chest at (${x}, ${y}, ${z})`);

  const chestBlock = bot.blockAt(new Vec3(Math.floor(x), Math.floor(y), Math.floor(z)));

  if (!chestBlock) {
    throw new ChestError(`No block found at (${x}, ${y}, ${z})`);
  }

  if (!chestBlock.name.includes('chest')) {
    throw new ChestError(`Block at (${x}, ${y}, ${z}) is not a chest (found: ${chestBlock.name})`);
  }

  const chest = await bot.openChest(chestBlock);

  const items: ChestItem[] = [];
  for (const item of chest.containerItems()) {
    items.push({
      name: item.name,
      count: item.count,
      slot: item.slot,
    });
  }

  log.info(`Chest opened, found ${items.length} item slots`);
  return items;
}

export async function grabFirstItemFromChest(x: number, y: number, z: number): Promise<ChestItem | null> {
  const bot = getBot();
  log.info(`Grabbing first item from chest at (${x}, ${y}, ${z})`);

  const chestBlock = bot.blockAt(new Vec3(Math.floor(x), Math.floor(y), Math.floor(z)));

  if (!chestBlock) {
    throw new ChestError(`No block found at (${x}, ${y}, ${z})`);
  }

  if (!chestBlock.name.includes('chest')) {
    throw new ChestError(`Block at (${x}, ${y}, ${z}) is not a chest (found: ${chestBlock.name})`);
  }

  const chest = await bot.openChest(chestBlock);

  const items = chest.containerItems();
  if (items.length === 0) {
    log.warn('Chest is empty');
    await chest.close();
    return null;
  }

  const firstItem = items[0]!;
  log.info(`Found item: ${firstItem.name} x${firstItem.count}`);

  try {
    await chest.withdraw(firstItem.type, firstItem.metadata, firstItem.count);
    log.info(`Withdrew ${firstItem.count}x ${firstItem.name}`);
    await chest.close();
    return {
      name: firstItem.name,
      count: firstItem.count,
      slot: firstItem.slot,
    };
  } catch (err) {
    await chest.close();
    throw new ChestError(`Failed to withdraw item: ${(err as Error).message}`);
  }
}

export async function validateChestHasItems(x: number, y: number, z: number): Promise<boolean> {
  const items = await openChestAt(x, y, z);
  return items.length > 0;
}

export function getInventoryItems(): ChestItem[] {
  const bot = getBot();
  const items: ChestItem[] = [];

  for (const item of bot.inventory.items()) {
    items.push({
      name: item.name,
      count: item.count,
      slot: item.slot,
    });
  }

  return items;
}

export async function dropAllItems(): Promise<void> {
  const bot = getBot();
  log.info('Dropping all inventory items');

  const items = bot.inventory.items();
  for (const item of items) {
    await bot.tossStack(item);
    log.debug(`Dropped ${item.count}x ${item.name}`);
  }

  log.info(`Dropped ${items.length} item stacks`);
}
