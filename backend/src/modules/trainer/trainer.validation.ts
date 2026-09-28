import { z } from 'zod';
import { POSTFLOP_TRAINER_FORMAT, TRAINER_FORMAT } from './trainer.types.js';

const actionType = z.enum(['fold', 'check', 'call', 'bet', 'raise', 'all-in']);
export const trainerActionSchema = z.object({
  type: actionType,
  amountBB: z.number().finite().positive().optional()
}).superRefine((value, context) => {
  const needsAmount = value.type === 'bet' || value.type === 'raise';
  if (needsAmount && value.amountBB === undefined) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount is required for bet and raise' });
  if (!needsAmount && value.amountBB !== undefined) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount is only valid for bet and raise' });
});

export const startSessionSchema = z.object({ format: z.literal(TRAINER_FORMAT).optional() });
export const postflopStartSessionSchema = z.object({ format: z.literal(POSTFLOP_TRAINER_FORMAT).optional() }).strict();
export const decisionSchema = z.object({ scenarioId: z.string().uuid(), requestId: z.string().min(1).max(100), action: trainerActionSchema });
export const postflopDecisionSchema = decisionSchema.strict();
export const nextScenarioSchema = z.object({ decisionId: z.string().uuid(), requestId: z.string().min(1).max(100) });
export const postflopNextScenarioSchema = nextScenarioSchema.strict();
export const cardSchema = z.object({
  rank: z.enum(['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']),
  suit: z.enum(['s', 'h', 'd', 'c'])
}).strict();
export const postflopBoardSchema = z.array(cardSchema).superRefine((cards, context) => {
  if (![3, 4, 5].includes(cards.length)) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Postflop board must contain exactly 3, 4, or 5 cards' });
  if (new Set(cards.map((card) => `${card.rank}${card.suit}`)).size !== cards.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Postflop board cards must be unique' });
});
export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;
export type NextScenarioInput = z.infer<typeof nextScenarioSchema>;
export type PostflopBoard = z.infer<typeof postflopBoardSchema>;
