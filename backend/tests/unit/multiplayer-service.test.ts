import { describe, expect, it } from 'vitest';
import { startHand, submitAction } from '../../src/poker-engine/engine.js';

describe('multiplayer Poker Engine adapter boundary', () => {
  it('uses the engine for fold transitions without client-side state mutation', () => {
    const hand = startHand('owner', 2, 100, 11);
    const actingSeat = hand.seatToAct!;
    submitAction(hand, { seatNumber: actingSeat, type: 'fold', amount: null, bettingRound: hand.bettingRound });

    expect(hand.bettingRound).toBe('complete');
    expect(hand.seatToAct).toBeNull();
    expect(hand.result?.potsAwarded).toHaveLength(1);
  });

  it('advances a legal check/call transition through the shared engine', () => {
    const hand = startHand('owner', 2, 100, 12);
    const actingSeat = hand.seatToAct!;
    const action = hand.seats.find((seat) => seat.seatNumber === actingSeat)!.streetContribution < hand.currentBet ? 'call' : 'check';
    submitAction(hand, { seatNumber: actingSeat, type: action, amount: null, bettingRound: hand.bettingRound });

    expect(hand.actionHistory).toHaveLength(1);
    expect(hand.seatToAct).not.toBe(actingSeat);
  });
});