import { describe, expect, it } from 'vitest';
import type { HandState, Seat } from '../../../src/poker-engine/types.js';
import { computePots } from '../../../src/poker-engine/pots.js';

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
});