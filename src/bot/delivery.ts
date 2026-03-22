import { executeHome, executeTpa, executeKill, CommandError } from './commands.js';
import { navigateToPosition, grabFirstItemFromChest, dropAllItems, ChestError } from './chest.js';
import { db } from '../db/index.js';
import { kits, orders, type Kit, type Order, type OrderStatus } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { createLogger } from '../utils/logger.js';
import { botManager } from './connection.js';

const log = createLogger('bot:delivery');

export type DeliveryResult = {
  success: boolean;
  status: OrderStatus;
  error?: string;
};

export class DeliveryService {
  async getKit(kitId: string): Promise<Kit | null> {
    const result = await db.select().from(kits).where(eq(kits.id, kitId)).limit(1);
    return result[0] ?? null;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, errorMessage?: string): Promise<void> {
    const updateData: Partial<Order> = {
      status,
      errorMessage,
    };

    if (status === 'completed' || status === 'failed' || status === 'timeout') {
      updateData.completedAt = new Date();
    }

    await db.update(orders).set(updateData).where(eq(orders.id, orderId));
    log.info(`Order ${orderId} status updated to: ${status}`);
  }

  async deliver(orderId: string, kitId: string, playerName: string): Promise<DeliveryResult> {
    log.info(`Starting delivery for order ${orderId}, kit ${kitId} to player ${playerName}`);

    try {
      if (!botManager.isBotReady()) {
        throw new Error('Bot is not ready');
      }

      const kit = await this.getKit(kitId);
      if (!kit) {
        throw new Error(`Kit ${kitId} not found`);
      }

      log.info(`Kit info: ${kit.name}, home: ${kit.homeName}, chest: (${kit.chestX}, ${kit.chestY}, ${kit.chestZ})`);

      await executeHome(kit.homeName);
      log.info('Teleported to home location');

      await navigateToPosition(kit.chestX, kit.chestY, kit.chestZ);
      log.info('Navigated to chest');

      const item = await grabFirstItemFromChest(kit.chestX, kit.chestY, kit.chestZ);
      if (!item) {
        await this.updateOrderStatus(orderId, 'failed', 'Chest is empty');
        await executeKill();
        return { success: false, status: 'failed', error: 'Chest is empty' };
      }
      log.info(`Grabbed ${item.count}x ${item.name} from chest`);

      try {
        await executeTpa(playerName);
        log.info(`TPA accepted by ${playerName}`);
      } catch (tpaError) {
        log.error(`TPA failed: ${(tpaError as Error).message}`);
        await this.updateOrderStatus(orderId, 'timeout', (tpaError as Error).message);
        await executeKill();
        return { success: false, status: 'timeout', error: (tpaError as Error).message };
      }

      await executeKill();
      log.info('Bot killed and respawned at spawn, items dropped at player location');

      await this.updateOrderStatus(orderId, 'completed');
      return { success: true, status: 'completed' };
    } catch (error) {
      const errorMessage = (error as Error).message;
      log.error(`Delivery failed: ${errorMessage}`);
      await this.updateOrderStatus(orderId, 'failed', errorMessage);

      try {
        await executeKill();
      } catch {
        log.warn('Failed to execute /kill after delivery failure');
      }

      return { success: false, status: 'failed', error: errorMessage };
    }
  }
}

export const deliveryService = new DeliveryService();
