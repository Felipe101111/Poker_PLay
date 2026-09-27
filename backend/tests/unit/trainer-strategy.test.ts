import { describe, expect, it } from 'vitest';
import { classifyAction, lookupStrategy } from '../../src/modules/trainer/trainer.strategy.js';

describe('trainer strategy dataset', () => {
  it('returns versioned mixed recommendations and classifies supported actions', () => {
    const strategy = lookupStrategy('SIX_MAX_100BB_PREFLOP:BTN');
    expect(strategy?.version).toBe('preflop-v1');
    expect(strategy?.actions.reduce((sum, item) => sum + item.frequency, 0)).toBe(1);
    expect(classifyAction(strategy!, { type: 'raise', amountBB: 2.5 })).toBe('PREFERRED');
    expect(classifyAction(strategy!, { type: 'fold' })).toBe('ACCEPTABLE_MIXED');
  });

  it('makes missing strategy explicit', () => {
    expect(lookupStrategy('SIX_MAX_100BB_PREFLOP:UTG')).toBeNull();
  });
});
