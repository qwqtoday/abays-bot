import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

export const createKitSchema = z.object({
  name: z.string().min(1).max(100),
  homeName: z.string().min(1).max(100),
  chestX: z.number(),
  chestY: z.number(),
  chestZ: z.number(),
});

export const updateKitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  homeName: z.string().min(1).max(100).optional(),
  chestX: z.number().optional(),
  chestY: z.number().optional(),
  chestZ: z.number().optional(),
});

export const createOrderSchema = z.object({
  kitId: z.string().uuid(),
  playerName: z.string().min(1).max(16),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateKitInput = z.infer<typeof createKitSchema>;
export type UpdateKitInput = z.infer<typeof updateKitSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
