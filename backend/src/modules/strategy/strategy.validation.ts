import { z } from 'zod';
import type { StrategyDatasetVersion, StrategyLookupRequest, StrategyRow } from './strategy.types.js';
import { ApiError } from '../../shared/errors.js';

export const strategyActionSchema = z.object({
  action: z.object({ type: z.enum(['fold', 'check', 'call', 'bet', 'raise', 'all-in']), amountBB: z.number().finite().nonnegative().optional() }),
  frequency: z.number().finite().min(0).max(1)
});
export const strategyRowSchema = z.object({
  id: z.string().min(1), datasetVersionId: z.string().min(1), contextKey: z.string().min(1), range: z.any().nullable().default(null),
  actions: z.array(strategyActionSchema), factors: z.array(z.string()), assumptions: z.array(z.string()), conditions: z.array(z.string())
});
export const strategyVersionSchema = z.object({
  id: z.string().min(1), version: z.string().min(1), schemaVersion: z.string().min(1), gameFormat: z.string().min(1),
  street: z.enum(['preflop', 'flop', 'turn', 'river']), tableSize: z.number().int().positive(), stackAssumptions: z.array(z.string()),
  blindAssumptions: z.array(z.string()), source: z.string().min(1), contentHash: z.string().optional(), assumptions: z.array(z.string()),
  precision: z.number().finite().positive(), status: z.enum(['PUBLISHED', 'RETIRED']), publishedAt: z.string(), retiredAt: z.string().optional()
});
export const strategyLookupSchema = z.object({ datasetVersion: z.string().min(1), contextKey: z.string().min(1), gameFormat: z.string().min(1), street: z.enum(['preflop', 'flop', 'turn', 'river']) });

export function validateStrategyVersion(input: unknown): StrategyDatasetVersion {
  const parsed = strategyVersionSchema.safeParse(input);
  if (!parsed.success) throw new ApiError(400, 'EVALUATION_CONTEXT_INVALID', parsed.error.issues[0]?.message ?? 'Invalid strategy version');
  return parsed.data;
}
export function validateStrategyRow(input: unknown): StrategyRow {
  const parsed = strategyRowSchema.safeParse(input);
  if (!parsed.success) throw new ApiError(400, 'EVALUATION_CONTEXT_INVALID', parsed.error.issues[0]?.message ?? 'Invalid strategy row');
  const total = parsed.data.actions.reduce((sum, action) => sum + action.frequency, 0);
  if (parsed.data.actions.length === 0 || Math.abs(total - 1) > 0.000001) throw new ApiError(400, 'EVALUATION_CONTEXT_INVALID', 'Strategy action frequencies must total 1');
  return { ...parsed.data, range: parsed.data.range ?? null };
}
export function validateStrategyLookup(input: unknown): StrategyLookupRequest {
  const parsed = strategyLookupSchema.safeParse(input);
  if (!parsed.success) throw new ApiError(400, 'EVALUATION_CONTEXT_INVALID', parsed.error.issues[0]?.message ?? 'Invalid strategy lookup');
  return parsed.data;
}
