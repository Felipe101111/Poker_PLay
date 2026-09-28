import type { Card, Rank, Suit } from '../../poker-engine/types.js';

export type { Card, Rank, Suit };
export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type CalculationMethod = 'EXACT';

export interface Combo {
  cards: [Card, Card];
  weight: number;
  sourceWeight?: number;
  blocked?: boolean;
}

export interface Range {
  id?: string;
  label: string;
  combos: Combo[];
  normalizationFactor?: number;
  totalWeight?: number;
  sourceNotation?: string;
}

export interface BoardState {
  street: Street;
  cards: Card[];
  knownCards?: Card[];
}

export interface EquityParticipant {
  id: string;
  holding?: { cards: [Card, Card] };
  range?: Range;
}

export interface EquityAnalysisRequest {
  street: Street;
  board: Card[];
  participants: EquityParticipant[];
  method: CalculationMethod;
  precision: number;
}

export interface EquityParticipantResult {
  id: string;
  winProbability: number;
  equity: number;
}

export interface EquityAnalysisResult {
  method: CalculationMethod;
  precision: number;
  runoutsEvaluated: number;
  participants: EquityParticipantResult[];
  tieProbability: number;
  blockedComboCount: number;
  remainingWeight: Record<string, number>;
  inputFingerprint: string;
}

export interface RangeFilterResult {
  combos: Combo[];
  removedComboCount: number;
  remainingWeight: number;
}
