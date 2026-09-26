import { z } from 'zod';

export const roomTableParamsSchema = z.object({ roomId: z.string().uuid('Invalid room id') });

const actionBase = {
  handId: z.string().uuid('Invalid hand id'),
  expectedVersion: z.number().int().positive(),
  requestId: z.string().min(1).max(128)
};

export const tableActionSchema = z.union([
  z.object({ ...actionBase, type: z.literal('fold'), amount: z.undefined().optional() }),
  z.object({ ...actionBase, type: z.literal('check'), amount: z.undefined().optional() }),
  z.object({ ...actionBase, type: z.literal('call'), amount: z.undefined().optional() }),
  z.object({ ...actionBase, type: z.literal('all-in'), amount: z.undefined().optional() }),
  z.object({ ...actionBase, type: z.literal('bet'), amount: z.number().int().nonnegative() }),
  z.object({ ...actionBase, type: z.literal('raise'), amount: z.number().int().nonnegative() })
]);

export const reconnectSchema = z.object({ lastSeenVersion: z.number().int().nonnegative() });

export const tableHeartbeatSchema = z.object({ roomId: z.string().uuid('Invalid room id') });

export type TableActionInput = z.infer<typeof tableActionSchema>;
export type ReconnectInput = z.infer<typeof reconnectSchema>;
