import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { createStartedMultiplayerRoom } from '../helpers/multiplayer.js';
import { prisma } from '../../src/db/prisma/client.js';
import { resolveShowdown, startHand, submitAction } from '../../src/poker-engine/engine.js';
import type { HandState, Seat } from '../../src/poker-engine/types.js';

const app = buildTestApp();

const resultSeat = (seatNumber: number, totalContribution: number, holeCards: Seat['holeCards'], folded = false): Seat => ({
  seatNumber,
  stack: 0,
  holeCards,
  folded,
  isAllIn: true,
  streetContribution: 0,
  totalContribution,
  actedThisStreet: true
});

describe('multiplayer hand results', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('projects a fold result after the next hand starts and keeps it immutable', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'results');
    const initial = await fixture.host.agent.get(`/api/rooms/${fixture.roomId}/table`);
    const acting = initial.body.table.currentHand.players.find((player: { seatNumber: number }) => player.seatNumber === initial.body.table.currentHand.actingSeat);
    const actor = acting.userId === fixture.host.id ? fixture.host : fixture.guest;
    const completed = await actor.agent.post(`/api/rooms/${fixture.roomId}/table/actions`).send({
      handId: initial.body.table.currentHand.id,
      expectedVersion: initial.body.table.stateVersion,
      requestId: 'result-fold',
      type: 'fold'
    });
    const resultBefore = completed.body.table.lastCompletedHand;
    const persistedBefore = await prisma.multiplayerHand.findUnique({ where: { id: resultBefore.id } });
    const next = await fixture.host.agent.get(`/api/rooms/${fixture.roomId}/table`);
    const persistedAfter = await prisma.multiplayerHand.findUnique({ where: { id: resultBefore.id } });

    expect(resultBefore.result.potsAwarded).toHaveLength(1);
    expect(next.body.table.lastCompletedHand.result).toEqual(resultBefore.result);
    expect(persistedAfter?.resultSnapshot).toEqual(persistedBefore?.resultSnapshot);
  });

  it('projects a showdown result with revealed cards and updated stacks', () => {
    const hand = startHand('results-showdown', 2, 100, 12);
    for (let attempt = 0; attempt < 100 && hand.bettingRound !== 'complete'; attempt++) {
      const actingSeat = hand.seats.find((seat) => seat.seatNumber === hand.seatToAct)!;
      const action = actingSeat.streetContribution < hand.currentBet ? 'call' : 'check';
      submitAction(hand, { seatNumber: actingSeat.seatNumber, type: action, amount: null, bettingRound: hand.bettingRound as never });
    }

    expect(hand.bettingRound).toBe('complete');
    expect(hand.result?.revealedSeats).toEqual([1, 2]);
    expect(hand.result?.potsAwarded).toHaveLength(1);
    expect(hand.seats.reduce((sum, seat) => sum + seat.stack, 0)).toBe(400);
  });

  it('awards tied and side pots according to engine eligibility', () => {
    const hand: HandState = {
      id: 'results-side-pot',
      ownerUserId: 'results-owner',
      seats: [
        resultSeat(1, 10, [{ rank: 'A', suit: 's' }, { rank: 'K', suit: 's' }]),
        resultSeat(2, 20, [{ rank: 'K', suit: 'h' }, { rank: 'Q', suit: 'h' }]),
        resultSeat(3, 20, [{ rank: 'Q', suit: 's' }, { rank: 'Q', suit: 'c' }])
      ],
      dealerSeat: 1,
      smallBlindSeat: 2,
      bigBlindSeat: 3,
      deck: [],
      communityCards: [
        { rank: '2', suit: 'c' },
        { rank: '7', suit: 'd' },
        { rank: '9', suit: 'h' },
        { rank: 'J', suit: 'c' },
        { rank: 'K', suit: 'd' }
      ],
      bettingRound: 'river',
      currentBet: 0,
      minRaiseIncrement: 2,
      seatToAct: null,
      pots: [],
      actionHistory: [],
      result: null
    };

    resolveShowdown(hand);

    expect(hand.result?.potsAwarded).toEqual([
      { amount: 30, eligibleSeats: [1, 2, 3], winners: [1] },
      { amount: 20, eligibleSeats: [2, 3], winners: [2] }
    ]);
    expect(hand.seats.map((player) => player.stack)).toEqual([30, 20, 0]);
  });

  it('splits an odd tied pot without losing chips', () => {
    const hand: HandState = {
      id: 'results-tie',
      ownerUserId: 'results-owner',
      seats: [
        resultSeat(1, 2, [{ rank: '2', suit: 'h' }, { rank: '3', suit: 'h' }]),
        resultSeat(2, 3, [{ rank: '4', suit: 'h' }, { rank: '5', suit: 'h' }])
      ],
      dealerSeat: 1,
      smallBlindSeat: 1,
      bigBlindSeat: 2,
      deck: [],
      communityCards: [
        { rank: 'A', suit: 's' },
        { rank: 'K', suit: 's' },
        { rank: 'Q', suit: 's' },
        { rank: 'J', suit: 's' },
        { rank: 'T', suit: 's' }
      ],
      bettingRound: 'river',
      currentBet: 0,
      minRaiseIncrement: 2,
      seatToAct: null,
      pots: [],
      actionHistory: [],
      result: null
    };

    resolveShowdown(hand);

    expect(hand.result?.potsAwarded[0].winners).toEqual([1, 2]);
    expect(hand.seats.map((player) => player.stack)).toEqual([2, 3]);
  });
});
