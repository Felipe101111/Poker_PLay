import type { Card, Deck, Rank, Suit, Seat } from './types.js';
import type { Rng } from './rng.js';

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS: Suit[] = ['s', 'h', 'd', 'c'];

export function createDeck(): Deck {
  const deck: Deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

// Fisher-Yates shuffle, in place, using the supplied RNG (deterministic given a seeded rng).
export function shuffle(deck: Deck, rng: Rng): Deck {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Deals 2 hole cards to each seat, mutating both the seats and the deck (removing dealt cards).
export function dealHoleCards(seats: Seat[], deck: Deck): void {
  for (const seat of seats) {
    const first = deck.shift();
    const second = deck.shift();
    if (!first || !second) {
      throw new Error('Not enough cards in the deck to deal hole cards');
    }
    seat.holeCards = [first, second];
  }
}

export function dealCommunityCards(count: number, deck: Deck): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    const card = deck.shift();
    if (!card) {
      throw new Error('Not enough cards in the deck to deal community cards');
    }
    cards.push(card);
  }
  return cards;
}
