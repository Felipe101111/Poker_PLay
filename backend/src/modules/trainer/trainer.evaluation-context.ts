import type { EvaluationContext } from '../strategy/strategy.types.js';
import type { Card, HandState } from '../../poker-engine/types.js';

function streetForBoard(cardCount: number): EvaluationContext['street'] {
  if (cardCount === 0) return 'preflop';
  if (cardCount === 3) return 'flop';
  if (cardCount === 4) return 'turn';
  return 'river';
}

export function evaluationContextFromScenario(scenario: {
  engineSnapshot: unknown;
  holeCards: unknown;
  position: string;
  tableSize: number;
  effectiveStackBB: number;
  priorActions: unknown;
  strategyVersion?: string | null;
  gameFormat?: string;
  potBB?: number;
  legalActions?: unknown;
  strategyKey?: string;
}): EvaluationContext {
  const hand = scenario.engineSnapshot as HandState;
  const heroCards = scenario.holeCards as [Card, Card];
  const opponentHoldings = hand.seats
    .filter((seat) => !seat.folded && seat.seatNumber !== hand.seatToAct && seat.holeCards)
    .map((seat) => ({ cards: seat.holeCards }));
  return {
    street: streetForBoard(hand.communityCards.length),
    gameFormat: scenario.gameFormat ?? 'SIX_MAX_100BB_PREFLOP',
    heroCards,
    board: hand.communityCards,
    position: scenario.position,
    tableSize: scenario.tableSize,
    effectiveStackBB: scenario.effectiveStackBB,
    priorActions: scenario.priorActions as unknown[],
    potBB: scenario.potBB,
    legalActions: scenario.legalActions,
    strategyKey: scenario.strategyKey,
    strategyVersion: scenario.strategyVersion ?? undefined,
    calculationConfig: { method: 'EXACT', precision: 0.000001 },
    opponentHoldings
  } as EvaluationContext & { opponentHoldings: unknown[] };
}
