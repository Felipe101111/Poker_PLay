import { describe, it } from 'vitest';
import { expect } from 'vitest';
import { continuePostflopScenario, generatePostflopScenario } from '../../src/modules/trainer/trainer.postflop-generator.js';

describe('postflop transitions', () => {
  it('advances from flop to turn to river with unique boards', () => {
    const flop = generatePostflopScenario('user-808', 808006);
    const flopAction = flop.hand.seatToAct!;
    const first = continuePostflopScenario(flop.hand, { seatNumber: flopAction, type: 'check', amount: null, bettingRound: 'flop' });
    expect(first?.street).toBe('turn');
    expect(first?.hand.communityCards).toHaveLength(4);
    const second = continuePostflopScenario(first!.hand, { seatNumber: first!.hand.seatToAct!, type: 'check', amount: null, bettingRound: 'turn' });
    expect(second?.street).toBe('river');
    expect(second?.hand.communityCards).toHaveLength(5);
    expect(new Set(second!.hand.communityCards.map((card) => `${card.rank}${card.suit}`)).size).toBe(5);
  });

  it('does not fabricate a next street after a fold', () => {
    const flop = generatePostflopScenario('user-808', 808006);
    expect(continuePostflopScenario(flop.hand, { seatNumber: flop.hand.seatToAct!, type: 'fold', amount: null, bettingRound: 'flop' })).toBeNull();
  });
});
