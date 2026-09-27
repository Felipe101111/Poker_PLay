import dataset from './data/preflop-strategy.v1.json' with { type: 'json' };
import type { TrainerActionInput, TrainerEvaluationCategory } from './trainer.types.js';

export interface StrategyRecommendation {
  version: string;
  key: string;
  actions: Array<{ action: TrainerActionInput; frequency: number }>;
  assumptions: string[];
  factors: string[];
}

interface StrategyDataset {
  version: string;
  recommendations: Record<string, { actions: Array<{ action: TrainerActionInput; frequency: number }>; assumptions: string[]; factors: string[] }>;
}

const strategyDataset = dataset as StrategyDataset;

export function lookupStrategy(key: string): StrategyRecommendation | null {
  const recommendation = strategyDataset.recommendations[key];
  return recommendation ? { ...recommendation, version: strategyDataset.version, key } : null;
}

export function classifyAction(strategy: StrategyRecommendation, selected: TrainerActionInput): TrainerEvaluationCategory {
  const match = strategy.actions.find((candidate) => candidate.action.type === selected.type && candidate.action.amountBB === selected.amountBB);
  if (!match) return 'SIGNIFICANT_DEVIATION';
  if (match.frequency >= 0.5) return 'PREFERRED';
  if (match.frequency > 0) return 'ACCEPTABLE_MIXED';
  return 'MARGINAL';
}
