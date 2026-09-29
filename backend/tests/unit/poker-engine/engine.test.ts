import { describe, it, expect } from 'vitest';
import { abandonSeat, startHand, submitAction } from '../../../src/poker-engine/engine.js';

describe('startHand', () => {
  it('assigns dealer/SB/BB and posts correct blind amounts for a ring game', () => {
    const hand = startHand('user-1', 4, 100, 1);

    expect(hand.dealerSeat).toBe(1);
    expect(hand.smallBlindSeat).toBe(2);
    expect(hand.bigBlindSeat).toBe(3);
    expect(hand.seatToAct).toBe(4);

    const sb = hand.seats.find((s) => s.seatNumber === 2)!;
    const bb = hand.seats.find((s) => s.seatNumber === 3)!;
    expect(sb.streetContribution).toBe(1);
    expect(bb.streetContribution).toBe(2);
    expect(sb.stack).toBe(100 * 2 - 1);
    expect(bb.stack).toBe(100 * 2 - 2);
    expect(hand.currentBet).toBe(2);
  });

  it('heads-up: dealer posts SB and acts first preflop', () => {
    const hand = startHand('user-1', 2, 100, 1);

    expect(hand.smallBlindSeat).toBe(hand.dealerSeat);
    expect(hand.seatToAct).toBe(hand.dealerSeat);
  });

  it('deals exactly 2 hole cards to every seat', () => {
    const hand = startHand('user-1', 5, 100, 1);
    for (const seat of hand.seats) {
      expect(seat.holeCards).not.toBeNull();
      expect(seat.holeCards).toHaveLength(2);
    }
  });

  it('posts a short stack as an all-in blind when the stack is smaller than the blind', () => {
    // startingStackBB=0 -> startingStack=0 chips, so even the SB (1 chip) exceeds the stack.
    const hand = startHand('user-1', 3, 0, 1);
    const sb = hand.seats.find((s) => s.seatNumber === hand.smallBlindSeat)!;
    expect(sb.stack).toBe(0);
    expect(sb.isAllIn).toBe(true);
  });

  it('deals the flop once preflop betting closes', () => {
    const hand = startHand('user-1', 3, 100, 1);
    submitAction(hand, { seatNumber: hand.seatToAct!, type: 'call', amount: null, bettingRound: 'preflop' });
    submitAction(hand, { seatNumber: hand.seatToAct!, type: 'call', amount: null, bettingRound: 'preflop' });
    submitAction(hand, { seatNumber: hand.seatToAct!, type: 'check', amount: null, bettingRound: 'preflop' });

    expect(hand.bettingRound).toBe('flop');
    expect(hand.communityCards).toHaveLength(3);
    expect(hand.currentBet).toBe(0);
  });

  it('ends immediately without showdown when all other seats fold', () => {
    const hand = startHand('user-1', 3, 100, 1);
    submitAction(hand, { seatNumber: hand.seatToAct!, type: 'fold', amount: null, bettingRound: 'preflop' });
    submitAction(hand, { seatNumber: hand.seatToAct!, type: 'fold', amount: null, bettingRound: 'preflop' });

    expect(hand.bettingRound).toBe('complete');
    expect(hand.seatToAct).toBeNull();
    expect(hand.result).not.toBeNull();
    expect(hand.result!.revealedSeats).toEqual([]);
  });

  it('folds an abandoning acting seat through normal hand progression', () => {
    const hand = startHand('user-1', 3, 100, 1);
    const leavingSeat = hand.seatToAct!;

    abandonSeat(hand, leavingSeat);

    expect(hand.seats.find((seat) => seat.seatNumber === leavingSeat)?.folded).toBe(true);
    expect(hand.actionHistory.at(-1)).toMatchObject({ seatNumber: leavingSeat, type: 'fold' });
    expect(hand.seatToAct).not.toBe(leavingSeat);
  });

  it('folds an abandoning non-acting seat without stealing the active turn', () => {
    const hand = startHand('user-1', 3, 100, 1);
    const activeSeat = hand.seatToAct!;
    const leavingSeat = hand.seats.find((seat) => seat.seatNumber !== activeSeat)!.seatNumber;

    abandonSeat(hand, leavingSeat);

    expect(hand.seats.find((seat) => seat.seatNumber === leavingSeat)?.folded).toBe(true);
    expect(hand.seatToAct).toBe(activeSeat);
  });

  it('auto-deals the remaining streets when every seat is all-in', () => {
    const hand = startHand('user-1', 3, 100, 1, [4, 4, 4]);

    submitAction(hand, { seatNumber: hand.seatToAct!, type: 'all-in', amount: null, bettingRound: 'preflop' });
    submitAction(hand, { seatNumber: hand.seatToAct!, type: 'all-in', amount: null, bettingRound: 'preflop' });
    submitAction(hand, { seatNumber: hand.seatToAct!, type: 'all-in', amount: null, bettingRound: 'preflop' });

    expect(hand.bettingRound).toBe('complete');
    expect(hand.communityCards).toHaveLength(5);
    expect(hand.result?.revealedSeats).toHaveLength(3);
    expect(hand.pots).toHaveLength(1);
  });
});
