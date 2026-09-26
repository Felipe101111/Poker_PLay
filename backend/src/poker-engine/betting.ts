import type { HandState, LegalActions, Action, ActionType } from './types.js';
import { ApiError } from '../shared/errors.js';

function getSeat(hand: HandState, seatNumber: number) {
  const seat = hand.seats.find((s) => s.seatNumber === seatNumber);
  if (!seat) {
    throw new ApiError(400, 'VALIDATION_ERROR', `Seat ${seatNumber} does not exist`);
  }
  return seat;
}

export function computeLegalActions(hand: HandState): LegalActions | null {
  if (hand.seatToAct === null) {
    return null;
  }
  const seat = getSeat(hand, hand.seatToAct);
  const amountOwed = hand.currentBet - seat.streetContribution;

  const actions: ActionType[] = ['fold'];

  if (amountOwed <= 0) {
    actions.push('check');
  } else if (seat.stack > 0) {
    actions.push('call');
  }

  let minBetOrRaise: number | null = null;
  let maxBetOrRaise: number | null = null;

  if (hand.currentBet === 0 && seat.stack > 0) {
    actions.push('bet');
    minBetOrRaise = Math.min(hand.minRaiseIncrement, seat.stack);
    maxBetOrRaise = seat.streetContribution + seat.stack;
  } else if (hand.currentBet > 0) {
    const minRaiseTotal = hand.currentBet + hand.minRaiseIncrement;
    const maxTotal = seat.streetContribution + seat.stack;
    if (maxTotal > hand.currentBet && maxTotal >= minRaiseTotal) {
      actions.push('raise');
      minBetOrRaise = minRaiseTotal;
      maxBetOrRaise = maxTotal;
    }
  }

  if (seat.stack > 0) {
    actions.push('all-in');
  }

  return {
    seatNumber: seat.seatNumber,
    actions,
    callAmount: amountOwed > 0 ? Math.min(amountOwed, seat.stack) : null,
    minBetOrRaise,
    maxBetOrRaise
  };
}

export function applyAction(hand: HandState, action: Action): void {
  if (action.seatNumber !== hand.seatToAct) {
    throw new ApiError(400, 'ILLEGAL_ACTION', "It is not this seat's turn to act");
  }

  const legal = computeLegalActions(hand);
  if (!legal || !legal.actions.includes(action.type)) {
    throw new ApiError(400, 'ILLEGAL_ACTION', `${action.type} is not a legal action for seat ${action.seatNumber}`);
  }

  const seat = getSeat(hand, action.seatNumber);
  const betBeforeAction = hand.currentBet;

  switch (action.type) {
    case 'fold': {
      seat.folded = true;
      break;
    }
    case 'check': {
      break;
    }
    case 'call': {
      const amount = legal.callAmount!;
      seat.stack -= amount;
      seat.streetContribution += amount;
      seat.totalContribution += amount;
      if (seat.stack === 0) seat.isAllIn = true;
      break;
    }
    case 'bet':
    case 'raise': {
      const total = action.amount;
      if (
        total === null ||
        total < (legal.minBetOrRaise ?? 0) ||
        total > (legal.maxBetOrRaise ?? Infinity)
      ) {
        throw new ApiError(
          400,
          'ILLEGAL_ACTION',
          `${action.type} amount must be between ${legal.minBetOrRaise} and ${legal.maxBetOrRaise}`
        );
      }
      const additional = total - seat.streetContribution;
      seat.stack -= additional;
      seat.streetContribution = total;
      seat.totalContribution += additional;
      hand.minRaiseIncrement = total - hand.currentBet;
      hand.currentBet = total;
      if (seat.stack === 0) seat.isAllIn = true;
      break;
    }
    case 'all-in': {
      const additional = seat.stack;
      const total = seat.streetContribution + additional;
      seat.stack = 0;
      seat.streetContribution = total;
      seat.totalContribution += additional;
      seat.isAllIn = true;
      if (total > hand.currentBet) {
        // Simplification (documented, Constitution P29): any all-in raise updates the minimum
        // raise size for subsequent players, even if it's a short all-in below a full raise.
        hand.minRaiseIncrement = total - hand.currentBet;
        hand.currentBet = total;
      }
      break;
    }
  }

  // A bet/raise/all-in that increased currentBet reopens the action: every other seat still
  // in the hand must respond again before the street can close.
  if (hand.currentBet > betBeforeAction) {
    for (const other of hand.seats) {
      if (other.seatNumber !== seat.seatNumber && !other.folded && !other.isAllIn) {
        other.actedThisStreet = false;
      }
    }
  }

  seat.actedThisStreet = true;
  hand.actionHistory.push(action);
}
