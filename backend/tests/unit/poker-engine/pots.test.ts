import { describe, expect, it } from 'vitest';
import type { HandState, Seat } from '../../../src/poker-engine/types.js';
import { computePots } from '../../../src/poker-engine/pots.js';
import { resolveShowdown } from '../../../src/poker-engine/engine.js';

const seat = (seatNumber: number, totalContribution: number, folded = false): Seat => ({
  seatNumber,
  stack: 0,
  holeCards: null,
  folded,
  isAllIn: true,
  streetContribution: 0,
  totalContribution,
  actedThisStreet: true
});

const handWithSeats = (seats: Seat[]): HandState => ({
  id: 'test-hand',
  ownerUserId: 'user-1',
  seats,
  dealerSeat: 1,
  smallBlindSeat: 2,
  bigBlindSeat: 3,
  deck: [],
  communityCards: [],
  bettingRound: 'showdown',
  currentBet: 0,
  minRaiseIncrement: 2,
  seatToAct: null,
  pots: [],
  actionHistory: [],
  result: null
});

describe('computePots', () => {
  it('builds main and side pots from unequal contributions', () => {
    const pots = computePots(handWithSeats([seat(1, 10), seat(2, 20), seat(3, 20)]));

    expect(pots).toEqual([
      { amount: 30, eligibleSeats: [1, 2, 3], winners: null },
      { amount: 20, eligibleSeats: [2, 3], winners: null }
    ]);
  });

  it('excludes folded seats from eligibility while retaining their contribution', () => {
    const pots = computePots(handWithSeats([seat(1, 10, true), seat(2, 10), seat(3, 20)]));

    expect(pots).toEqual([
      { amount: 30, eligibleSeats: [2, 3], winners: null },
      { amount: 10, eligibleSeats: [3], winners: null }
    ]);
  });

  it('splits an odd tied pot to the seat immediately left of the dealer', () => {
    const hand = handWithSeats([
      { ...seat(1, 2), stack: 0, holeCards: [{ rank: '2', suit: 'h' }, { rank: '3', suit: 'h' }] },
      { ...seat(2, 3), stack: 0, holeCards: [{ rank: '4', suit: 'h' }, { rank: '5', suit: 'h' }] }
    ]);
    hand.dealerSeat = 1;
    hand.communityCards = [
      { rank: 'A', suit: 's' },
      { rank: 'K', suit: 's' },
      { rank: 'Q', suit: 's' },
      { rank: 'J', suit: 's' },
      { rank: 'T', suit: 's' }
    ];
    hand.bettingRound = 'river';

    resolveShowdown(hand);

    expect(hand.pots[0].winners).toEqual([1, 2]);
    expect(hand.seats.find((seat) => seat.seatNumber === 2)?.stack).toBe(3);
    expect(hand.seats.find((seat) => seat.seatNumber === 1)?.stack).toBe(2);
  });
});