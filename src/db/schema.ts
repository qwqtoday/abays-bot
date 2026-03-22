import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const kits = sqliteTable('kits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  homeName: text('home_name').notNull(),
  chestX: real('chest_x').notNull(),
  chestY: real('chest_y').notNull(),
  chestZ: real('chest_z').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  kitId: text('kit_id').notNull().references(() => kits.id),
  playerName: text('player_name').notNull(),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed', 'timeout'] }).notNull().default('pending'),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type Kit = typeof kits.$inferSelect;
export type NewKit = typeof kits.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OrderStatus = Order['status'];
