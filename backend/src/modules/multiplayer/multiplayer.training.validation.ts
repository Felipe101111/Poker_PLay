import { z } from 'zod';

export const trainingRoomParamsSchema = z.object({ roomId: z.string().uuid('Invalid room id') });

export const trainingJoinSchema = z.object({ mode: z.literal('CREATE_OR_JOIN') });

export const trainingDecisionQuerySchema = z.object({
  handId: z.string().uuid('Invalid hand id').optional(),
  street: z.enum(['PREFLOP', 'FLOP', 'TURN', 'RIVER']).optional(),
  page: z.coerce.number().int().positive().max(10000).default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50)
});

export const trainingLeaveSchema = z.object({}).default({});

export const trainingSocketPayloadSchema = z.object({ roomId: z.string().uuid('Invalid room id') }).strict();

export const TRAINING_MAX_MESSAGE_BYTES = 16 * 1024;
export const TRAINING_ACTIONS_PER_MINUTE = 60;

export type TrainingJoinInput = z.infer<typeof trainingJoinSchema>;
export type TrainingDecisionQuery = z.infer<typeof trainingDecisionQuerySchema>;
