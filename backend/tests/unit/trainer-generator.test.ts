import { describe, expect, it } from 'vitest';
import { generateScenario } from '../../src/modules/trainer/trainer.generator.js';

describe('trainer scenario generator', () => {
  it('creates a deterministic six-player preflop scenario with unique cards', () => {
    const first = generateScenario('user-1', 606006);
    const second = generateScenario('user-1', 606006);
    const cards = first.hand.seats.flatMap((seat) => seat.holeCards ?? []);
    expect(first.seed).toBe(606006);
    expect({ ...first.hand, id: undefined }).toEqual({ ...second.hand, id: undefined });
    expect(first.hand.seats).toHaveLength(6);
    expect(new Set(cards.map((card) => `${card.rank}${card.suit}`)).size).toBe(12);
    expect(first.hand.bettingRound).toBe('preflop');
    expect(first.hand.actionHistory).toEqual([]);
    expect(first.legalActions.actions).toContain('fold');
  });
});
