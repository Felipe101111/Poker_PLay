import { randomUUID } from 'node:crypto';
import { startHand } from '../../src/poker-engine/engine.js';
import type { Card, HandState } from '../../src/poker-engine/types.js';
import type { TrainerStreet } from '../../src/modules/trainer/trainer.types.js';

export function postflopUserId(): string {
  return randomUUID();
}

export function deterministicPostflopHand(userId = postflopUserId(), seed = 808006): HandState {
  return startHand(userId, 6, 100, seed);
}

export function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export function allHandCardsUnique(hand: HandState): boolean {
  const cards = [...hand.seats.flatMap((seat) => seat.holeCards ?? []), ...hand.communityCards];
  return new Set(cards.map(cardKey)).size === cards.length;
}

export const postflopStreets: TrainerStreet[] = ['flop', 'turn', 'river'];
