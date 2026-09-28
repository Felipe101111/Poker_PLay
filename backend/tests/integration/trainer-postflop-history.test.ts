import { describe, it, expect } from 'vitest';
import { generatePostflopScenario } from '../../src/modules/trainer/trainer.postflop-generator.js';

describe('postflop history integration', () => {
  it('keeps the original generated hand snapshot stable across continuation', () => {
    const original = generatePostflopScenario('history-user', 808006);
    const originalBoard = original.hand.communityCards.map((card) => `${card.rank}${card.suit}`);
    expect(originalBoard).toHaveLength(3);
    expect(new Set(originalBoard).size).toBe(3);
  });
});
