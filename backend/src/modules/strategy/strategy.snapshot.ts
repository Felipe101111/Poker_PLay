import type { EvaluationContext, EvaluationSnapshot, StrategyDatasetVersion, StrategyRow } from './strategy.types.js';

export function createEvaluationSnapshot(input: {
  id: string;
  context: EvaluationContext;
  equity: unknown;
  dataset?: StrategyDatasetVersion;
  row?: StrategyRow;
  classification?: string;
  availability: EvaluationSnapshot['availability'];
}): EvaluationSnapshot {
  return {
    id: input.id,
    contextSnapshot: structuredClone(input.context),
    equitySnapshot: structuredClone(input.equity),
    strategyVersionSnapshot: input.dataset ? structuredClone(input.dataset) : undefined,
    strategyRowSnapshot: input.row ? structuredClone(input.row) : undefined,
    classification: input.classification,
    availability: input.availability,
    createdAt: new Date().toISOString()
  };
}
