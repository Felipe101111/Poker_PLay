import type { Card, HandState } from '../../poker-engine/types.js';
import type { TrainerStreet } from './trainer.types.js';

export interface PostflopScenarioContext {
  street: TrainerStreet;
  board: Card[];
  potBB: number;
  priorActions: HandState['actionHistory'];
  effectiveStackBB: number;
  legalActions: unknown;
  position: string;
  tableSize: number;
  strategyKey: string;
}

function streetForBoard(boardSize: number): TrainerStreet {
  if (boardSize === 3) return 'flop';
  if (boardSize === 4) return 'turn';
  if (boardSize === 5) return 'river';
  throw new Error('Postflop scenarios require a flop, turn, or river board');
}

export function normalizePostflopScenario(input: {
  engineSnapshot: unknown;
  position: string;
  effectiveStackBB: number;
  priorActions: unknown;
  legalActions: unknown;
  strategyKey: string;
}): PostflopScenarioContext {
  const hand = input.engineSnapshot as HandState;
  const board = hand.communityCards.map((card) => ({ rank: card.rank, suit: card.suit }));
  const potBB = hand.pots.reduce((total, pot) => total + pot.amount, 0) / 2;
  return {
    street: streetForBoard(board.length),
    board,
    potBB,
    priorActions: input.priorActions as HandState['actionHistory'],
    effectiveStackBB: input.effectiveStackBB,
    legalActions: input.legalActions,
    position: input.position,
    tableSize: 6,
    strategyKey: input.strategyKey
  };
}
