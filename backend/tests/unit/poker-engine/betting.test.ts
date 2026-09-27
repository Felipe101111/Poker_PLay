import { describe, it, expect } from 'vitest';
import { startHand } from '../../../src/poker-engine/engine.js';
import { computeLegalActions, applyAction } from '../../../src/poker-engine/betting.js';

describe('computeLegalActions', () => {
  it('offers call/raise/fold to the first-to-act preflop seat facing the big blind', () => {
    const hand = startHand('u1', 3, 100, 1);
    const legal = computeLegalActions(hand)!;

    expect(legal.seatNumber).toBe(hand.seatToAct);
    expect(legal.actions).toContain('fold');
    expect(legal.actions).toContain('call');
    expect(legal.actions).toContain('raise');
    expect(legal.actions).not.toContain('check');
    expect(legal.callAmount).toBe(2);
    expect(legal.minBetOrRaise).toBe(4); // currentBet(2) + minRaiseIncrement(2)
  });

  it('offers check/bet (not call) when there is nothing to call', () => {
    const hand = startHand('u1', 3, 100, 1);
    const seat = hand.seats.find((candidate) => candidate.seatNumber === hand.seatToAct)!;
    seat.streetContribution = hand.currentBet;

    const legal = computeLegalActions(hand)!;
    expect(legal.actions).toContain('check');
    expect(legal.actions).not.toContain('call');
  });

  it('offers an all-in call when the stack is smaller than the amount owed', () => {
    const hand = startHand('u1', 2, 100, 1);
    const shortStack = hand.seats.find((seat) => seat.seatNumber === hand.seatToAct)!;
    shortStack.stack = 1; // less than the 2-chip call
    const legal = computeLegalActions(hand)!;
    expect(legal.actions).toContain('call');
    expect(legal.callAmount).toBe(1);
  });
});

describe('applyAction', () => {
  it('rejects an action from a seat other than seatToAct', () => {
    const hand = startHand('u1', 3, 100, 1);
    const wrongSeat = hand.seats.find((s) => s.seatNumber !== hand.seatToAct)!.seatNumber;
    expect(() =>
      applyAction(hand, { seatNumber: wrongSeat, type: 'fold', amount: null, bettingRound: 'preflop' })
    ).toThrow(/turn/i);
  });

  it('rejects an illegal check when a call is owed', () => {
    const hand = startHand('u1', 3, 100, 1);
    expect(() =>
      applyAction(hand, { seatNumber: hand.seatToAct!, type: 'check', amount: null, bettingRound: 'preflop' })
    ).toThrow();
  });

  it('rejects a raise below the minimum legal amount', () => {
    const hand = startHand('u1', 3, 100, 1);
    expect(() =>
      applyAction(hand, { seatNumber: hand.seatToAct!, type: 'raise', amount: 3, bettingRound: 'preflop' })
    ).toThrow();
  });

  it('does not mutate state when an action is rejected', () => {
    const hand = startHand('u1', 3, 100, 1);
    const before = JSON.stringify(hand);
    try {
      applyAction(hand, { seatNumber: hand.seatToAct!, type: 'check', amount: null, bettingRound: 'preflop' });
    } catch {
      // expected
    }
    expect(JSON.stringify(hand)).toBe(before);
  });

  it('distinguishes an exact all-in raise from a short all-in call', () => {
    const raisingHand = startHand('u1', 3, 100, 1);
    const raisingSeat = raisingHand.seats.find((seat) => seat.seatNumber === raisingHand.seatToAct)!;
    raisingSeat.stack = 4;
    const raisingLegal = computeLegalActions(raisingHand)!;

    expect(raisingLegal.actions).toContain('all-in');
    expect(raisingLegal.actions).toContain('raise');
    applyAction(raisingHand, {
      seatNumber: raisingSeat.seatNumber,
      type: 'all-in',
      amount: null,
      bettingRound: 'preflop'
    });
    expect(raisingHand.currentBet).toBe(4);
    expect(raisingSeat.isAllIn).toBe(true);

    const callingHand = startHand('u1', 3, 100, 1);
    const callingSeat = callingHand.seats.find((seat) => seat.seatNumber === callingHand.seatToAct)!;
    callingSeat.stack = 1;
    const callingLegal = computeLegalActions(callingHand)!;

    expect(callingLegal.actions).toContain('call');
    expect(callingLegal.actions).not.toContain('raise');
    applyAction(callingHand, {
      seatNumber: callingSeat.seatNumber,
      type: 'call',
      amount: null,
      bettingRound: 'preflop'
    });
    expect(callingSeat.stack).toBe(0);
    expect(callingSeat.isAllIn).toBe(true);
    expect(callingHand.currentBet).toBe(2);
  });
});
