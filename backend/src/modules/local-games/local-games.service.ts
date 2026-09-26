import type { HandState, Seat, LegalActions, Pot } from '../../poker-engine/types.js';
import { computePots } from '../../poker-engine/pots.js';
import { handStore } from './hand-store.js';
import { ApiError } from '../../shared/errors.js';

export interface SeatView {
  seatNumber: number;
  stack: number;
  holeCards: Seat['holeCards'];
  folded: boolean;
  isAllIn: boolean;
}

export interface HandStateView {
  id: string;
  bettingRound: HandState['bettingRound'];
  communityCards: HandState['communityCards'];
  pots: Pot[];
  seatToAct: HandState['seatToAct'];
  legalActions: LegalActions | null;
  seats: SeatView[];
  result: HandState['result'];
}

const REVEALED_ROUNDS = new Set(['showdown', 'complete']);

// data-model.md Redaction rule: a seat's own hole cards are visible to itself; others are
// hidden unless the hand has reached showdown/complete and that seat did not fold. The
// remaining `deck` is never included in any view, for any seat, at any time.
export function toHandStateView(
  hand: HandState,
  asSeat: number,
  legalActions: LegalActions | null
): HandStateView {
  const revealAll = REVEALED_ROUNDS.has(hand.bettingRound);

  const seats: SeatView[] = hand.seats.map((seat) => {
    const isOwnSeat = seat.seatNumber === asSeat;
    const isRevealed = revealAll && !seat.folded;
    return {
      seatNumber: seat.seatNumber,
      stack: seat.stack,
      holeCards: isOwnSeat || isRevealed ? seat.holeCards : null,
      folded: seat.folded,
      isAllIn: seat.isAllIn
    };
  });

  return {
    id: hand.id,
    bettingRound: hand.bettingRound,
    communityCards: hand.communityCards,
    // Live pot totals are always computed fresh so the UI can show the pot size mid-hand,
    // not only once the hand reaches showdown/complete (winners stay null until then).
    pots: hand.bettingRound === 'complete' ? hand.pots : computePots(hand),
    seatToAct: hand.seatToAct,
    legalActions,
    seats,
    result: hand.result
  };
}

export function getActiveHandOrThrow(userId: string): HandState {
  const hand = handStore.get(userId);
  if (!hand) {
    throw new ApiError(404, 'HAND_NOT_FOUND', 'No active local hand for this user');
  }
  return hand;
}

export function assertSeatExists(hand: HandState, seatNumber: number): void {
  if (!hand.seats.some((s) => s.seatNumber === seatNumber)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `Seat ${seatNumber} does not exist in this hand`);
  }
}

// FR-016: explicit abandon capability — removes the in-memory entry entirely (no history kept).
export function abandonHand(userId: string): void {
  handStore.delete(userId);
}
