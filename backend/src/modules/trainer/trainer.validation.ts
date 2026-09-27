import { z } from 'zod';
import { TRAINER_FORMAT } from './trainer.types.js';

const actionType = z.enum(['fold', 'check', 'call', 'bet', 'raise', 'all-in']);
const action = z.object({
  type: actionType,
  amountBB: z.number().finite().positive().optional()
}).superRefine((value, context) => {
  const needsAmount = value.type === 'bet' || value.type === 'raise';
  if (needsAmount && value.amountBB === undefined) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount is required for bet and raise' });
  if (!needsAmount && value.amountBB !== undefined) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount is only valid for bet and raise' });
});

export const startSessionSchema = z.object({ format: z.literal(TRAINER_FORMAT).optional() });
export const decisionSchema = z.object({ scenarioId: z.string().uuid(), requestId: z.string().min(1).max(100), action });
export const nextScenarioSchema = z.object({ decisionId: z.string().uuid(), requestId: z.string().min(1).max(100) });
export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;
export type NextScenarioInput = z.infer<typeof nextScenarioSchema>;
