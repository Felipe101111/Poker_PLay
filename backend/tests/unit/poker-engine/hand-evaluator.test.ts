import { describe, expect, it } from 'vitest';
import type { Card } from '../../../src/poker-engine/types.js';
import { compareHandRanks, evaluate7CardHand } from '../../../src/poker-engine/hand-evaluator.js';

const card = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit });

describe('evaluate7CardHand', () => {
  it('recognizes a wheel straight with the ace playing low', () => {
    const rank = evaluate7CardHand(
      [card('A', 's'), card('2', 'd')],
      [card('3', 'h'), card('4', 'c'), card('5', 's'), card('K', 'd'), card('K', 'h')]
    );

    expect(rank).toEqual([4, 5]);
  });

  it('selects the best five-card hand from seven cards', () => {
    const rank = evaluate7CardHand(
      [card('A', 's'), card('A', 'd')],
      [card('A', 'h'), card('K', 'c'), card('K', 's'), card('2', 'd'), card('3', 'h')]
    );

    expect(rank).toEqual([6, 14, 13]);
  });

  it('compares tied categories by their kickers', () => {
    expect(compareHandRanks([1, 14, 13, 9], [1, 14, 12, 9])).toBeGreaterThan(0);
    expect(compareHandRanks([4, 5], [4, 6])).toBeLessThan(0);
  });
});