import type { ActionType, Card, HandState, LegalActions } from '../../poker-engine/types.js';
import type { EquityAnalysisResult } from '../equity/equity.types.js';

export const TRAINER_FORMAT = 'SIX_MAX_100BB_PREFLOP' as const;
export const POSTFLOP_TRAINER_FORMAT = 'SIX_MAX_100BB_POSTFLOP' as const;
export type TrainerFormat = typeof TRAINER_FORMAT | typeof POSTFLOP_TRAINER_FORMAT;
export type TrainerStreet = 'flop' | 'turn' | 'river';
export type TrainerTerminalReason = 'FOLD' | 'ALL_IN' | 'SHOWDOWN' | 'COMPLETE';
export type TrainerActionType = ActionType;
export type TrainerEvaluationCategory = 'PREFERRED' | 'ACCEPTABLE_MIXED' | 'MARGINAL' | 'SIGNIFICANT_DEVIATION';
export type TrainerEvaluationStatus = 'EVALUATED' | 'UNAVAILABLE';

export interface TrainerActionInput {
  type: TrainerActionType;
  amountBB?: number;
}

export interface TrainerScenarioView {
  id: string;
  sequence: number;
  tableSize: 6;
  position: string;
  effectiveStackBB: number;
  holeCards: Card[];
  blindContext: { smallBlind: number; bigBlind: number };
  priorActions: HandState['actionHistory'];
  legalActions: LegalActionsView;
  strategyAvailable: boolean;
  strategyVersion: string | null;
  street?: TrainerStreet;
  board?: Card[];
  potBB?: number;
  terminalReason?: TrainerTerminalReason | null;
}

export interface LegalActionsView {
  actions: TrainerActionType[];
  callAmountBB: number | null;
  minBetOrRaiseBB: number | null;
  maxBetOrRaiseBB: number | null;
}

export interface TrainerDecisionView {
  id: string;
  scenarioId: string;
  selectedAction: TrainerActionInput;
  evaluationStatus: TrainerEvaluationStatus;
  category: TrainerEvaluationCategory | null;
  recommendations: Array<{ action: TrainerActionInput; frequency: number }> | null;
  explanation: { factors: string[]; assumptions: string[] };
  equity: EquityAnalysisResult | null;
  street?: TrainerStreet;
  limitations?: string[];
}

export interface TrainerSessionView {
  id: string;
  status: 'ACTIVE' | 'COMPLETED';
  format: TrainerFormat;
}

export interface TrainerSessionResponse {
  session: TrainerSessionView;
  scenario: TrainerScenarioView | null;
  latestDecision: TrainerDecisionView | null;
  history?: TrainerDecisionView[];
}

export interface TrainerProgressView {
  completedDecisions: number;
  preferred: number;
  acceptableMixed: number;
  marginal: number;
  significantDeviation: number;
  unavailable: number;
  byAction: Record<string, number>;
  empty: boolean;
}

export function toActionAmountChips(action: TrainerActionInput): number | null {
  return action.amountBB === undefined ? null : Math.round(action.amountBB * 2);
}
