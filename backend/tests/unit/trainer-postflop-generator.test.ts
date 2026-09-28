import { describe, it } from 'vitest';
import { expect } from 'vitest';
import { generatePostflopScenario } from '../../src/modules/trainer/trainer.postflop-generator.js';

describe('postflop generator', () => {
  it('generates a deterministic decision-ready flop with unique visible cards', () => {
    const first = generatePostflopScenario('user-808', 808006);
    const second = generatePostflopScenario('user-808', 808006);
    const cards = first.hand.seats.flatMap((seat) => seat.holeCards ?? []).concat(first.hand.communityCards);
    expect(first.street).toBe('flop');
    expect(first.hand.communityCards).toHaveLength(3);
    expect(first.hand.seatToAct).not.toBeNull();
    expect(new Set(cards.map((card) => `${card.rank}${card.suit}`)).size).toBe(cards.length);
    expect({ ...first.hand, id: undefined }).toEqual({ ...second.hand, id: undefined });
    expect(first.strategyKey).toContain('flop:SIX_MAX_100BB_POSTFLOP:');
  });
});
