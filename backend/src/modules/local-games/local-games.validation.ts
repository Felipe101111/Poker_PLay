import { z } from 'zod';

// FR-001: 2-9 seats, default 100 BB starting stack.
export const startHandSchema = z.object({
  seatCount: z.number().int().min(2).max(9),
  startingStackBB: z.number().int().positive().default(100)
});

export type StartHandInput = z.infer<typeof startHandSchema>;

export const submitActionSchema = z.object({
  seatNumber: z.number().int().positive(),
  type: z.enum(['fold', 'check', 'call', 'bet', 'raise', 'all-in']),
  amount: z.number().int().positive().optional()
});

export type SubmitActionInput = z.infer<typeof submitActionSchema>;

export const asSeatQuerySchema = z.object({
  asSeat: z.coerce.number().int().positive()
});
