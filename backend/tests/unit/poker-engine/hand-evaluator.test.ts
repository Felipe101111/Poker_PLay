import { describe, expect, it } from 'vitest';
import type { Card } from '../../../src/poker-engine/types.js';
import { compareHandRanks, evaluate7CardHand } from '../../../src/poker-engine/hand-evaluator.js';

const card = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit });

describe('evaluate7CardHand', () => {
  it.each([
    ['high card', [0, 14, 13, 9, 7, 4], [card('A', 's'), card('K', 'd')], [card('9', 'h'), card('7', 'c'), card('2', 's'), card('4', 'd'), card('3', 'h')]],
    ['pair', [1, 14, 13, 9, 7], [card('A', 's'), card('A', 'd')], [card('K', 'h'), card('9', 'c'), card('7', 's'), card('4', 'd'), card('3', 'h')]],
    ['two pair', [2, 14, 13, 9], [card('A', 's'), card('A', 'd')], [card('K', 'h'), card('K', 'c'), card('9', 's'), card('4', 'd'), card('3', 'h')]],
    ['three of a kind', [3, 14, 13, 9], [card('A', 's'), card('A', 'd')], [card('A', 'h'), card('K', 'c'), card('9', 's'), card('4', 'd'), card('3', 'h')]],
    ['straight', [4, 6], [card('2', 's'), card('3', 'd')], [card('4', 'h'), card('5', 'c'), card('6', 's'), card('K', 'd'), card('9', 'h')]],
    ['flush', [5, 14, 11, 9, 6, 2], [card('A', 's'), card('2', 's')], [card('J', 's'), card('9', 's'), card('6', 's'), card('K', 'd'), card('3', 'h')]],
    ['full house', [6, 14, 13], [card('A', 's'), card('A', 'd')], [card('A', 'h'), card('K', 'c'), card('K', 's'), card('4', 'd'), card('3', 'h')]],
    ['four of a kind', [7, 14, 13], [card('A', 's'), card('A', 'd')], [card('A', 'h'), card('A', 'c'), card('K', 's'), card('4', 'd'), card('3', 'h')]],
    ['straight flush', [8, 6], [card('2', 's'), card('3', 's')], [card('4', 's'), card('5', 's'), card('6', 's'), card('K', 'd'), card('9', 'h')]]
  ])('recognizes %s', (_name, expected, holeCards, communityCards) => {
    expect(evaluate7CardHand(holeCards as [Card, Card], communityCards as Card[])).toEqual(expected);
  });

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