import { describe, it, expect } from 'vitest';
import { createDeck, shuffle } from '../../../src/poker-engine/deck.js';
import { createRng } from '../../../src/poker-engine/rng.js';

describe('shuffle', () => {
  it('is deterministic given the same seed', () => {
    const a = shuffle(createDeck(), createRng(42));
    const b = shuffle(createDeck(), createRng(42));
    expect(a).toEqual(b);
  });

  it('produces a different order for a different seed', () => {
    const a = shuffle(createDeck(), createRng(1));
    const b = shuffle(createDeck(), createRng(2));
    expect(a).not.toEqual(b);
  });

  it('always produces a full, non-duplicated 52-card permutation', () => {
    const deck = shuffle(createDeck(), createRng(7));
    expect(deck).toHaveLength(52);
    const unique = new Set(deck.map((c) => `${c.rank}${c.suit}`));
    expect(unique.size).toBe(52);
  });
});
