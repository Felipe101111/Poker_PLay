export type StrategyStatus = 'PUBLISHED' | 'RETIRED';
export type StrategyAvailability = 'AVAILABLE' | 'UNAVAILABLE';

export interface StrategyAction {
  action: { type: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'; amountBB?: number };
  frequency: number;
}

export interface StrategyDatasetVersion {
  id: string;
  version: string;
  schemaVersion: string;
  gameFormat: string;
  street: 'preflop' | 'flop' | 'turn' | 'river';
  tableSize: number;
  stackAssumptions: string[];
  blindAssumptions: string[];
  source: string;
  contentHash?: string;
  assumptions: string[];
  precision: number;
  status: StrategyStatus;
  publishedAt: string;
  retiredAt?: string;
}

export interface StrategyRow {
  id: string;
  datasetVersionId: string;
  contextKey: string;
  range: unknown | null;
  actions: StrategyAction[];
  factors: string[];
  assumptions: string[];
  conditions: string[];
}

export interface EvaluationContext {
  scenarioId?: string;
  street: StrategyDatasetVersion['street'];
  gameFormat: string;
  heroCards: unknown;
  board: unknown[];
  position?: string;
  tableSize: number;
  effectiveStackBB: number;
  priorActions: unknown[];
  potBB?: number;
  legalActions?: unknown;
  strategyKey?: string;
  strategyVersion?: string;
  calculationConfig: { method: 'EXACT'; precision: number };
  opponentHoldings?: unknown[];
}

export interface EvaluationSnapshot {
  id: string;
  contextSnapshot: EvaluationContext;
  scenarioId?: string;
  equitySnapshot: unknown;
  strategyVersionSnapshot?: StrategyDatasetVersion;
  strategyRowSnapshot?: StrategyRow;
  classification?: string;
  availability: 'AVAILABLE' | 'UNAVAILABLE' | 'INVALID_INPUT';
  calculationFingerprint?: string;
  createdAt: string;
}

export interface StrategyLookupRequest {
  datasetVersion: string;
  contextKey: string;
  gameFormat: string;
  street: StrategyDatasetVersion['street'];
}

export type StrategyLookupResult =
  | { availability: 'AVAILABLE'; dataset: StrategyDatasetVersion; row: StrategyRow }
  | { availability: 'UNAVAILABLE'; datasetVersion: string; contextKey: string; reason: 'STRATEGY_VERSION_NOT_FOUND' | 'NO_COMPATIBLE_STRATEGY_ROW' };
