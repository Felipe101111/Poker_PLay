import type { Card } from '../../src/poker-engine/types.js';
import type { EquityAnalysisRequest, Range } from '../../src/modules/equity/equity.types.js';

export const card = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit });
export const holding = (first: Card, second: Card) => ({ cards: [first, second] as [Card, Card] });
export const weightedRange = (label: string, combos: Range['combos']): Range => ({ label, combos });
export function equityRequest(participants: EquityAnalysisRequest['participants'], board: Card[] = []): EquityAnalysisRequest {
  return { street: board.length === 0 ? 'preflop' : board.length === 3 ? 'flop' : board.length === 4 ? 'turn' : 'river', board, participants, method: 'EXACT', precision: 0.000001 };
}
