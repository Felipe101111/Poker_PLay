import { describe, it } from 'vitest';
import { expect } from 'vitest';
import { evaluateTrainerScenario } from '../../src/modules/trainer/trainer.evaluation.js';
import { lookupPostflopStrategy } from '../../src/modules/trainer/trainer.strategy.js';
import { card } from '../helpers/equity-strategy.js';

describe('postflop evaluation', () => {
  it('keeps exact heads-up equity independent from strategy availability', () => {
    const context = {
      street: 'flop' as const,
      gameFormat: 'SIX_MAX_100BB_POSTFLOP',
      heroCards: [card('A', 's'), card('K', 's')],
      board: [card('2', 'c'), card('7', 'd'), card('Q', 'c')],
      tableSize: 6,
      effectiveStackBB: 100,
      priorActions: [],
      calculationConfig: { method: 'EXACT' as const, precision: 0.01 },
      opponentHoldings: [{ cards: [card('Q', 's'), card('J', 's')] }]
    };
    const evaluated = evaluateTrainerScenario(context, () => lookupPostflopStrategy('missing-context'));
    expect(evaluated.equity?.method).toBe('EXACT');
    expect(evaluated.availability).toBe('UNAVAILABLE');
    expect(evaluated.strategy).toBeNull();
  });

  it('loads mixed frequencies for an available street context', () => {
    const strategy = lookupPostflopStrategy('flop:SIX_MAX_100BB_POSTFLOP:SB:100bb:checked-to-hero');
    expect(strategy?.version).toBe('postflop-v1');
    expect(strategy?.actions.reduce((sum, action) => sum + action.frequency, 0)).toBe(1);
  });
});
