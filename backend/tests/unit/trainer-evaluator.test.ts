import { describe, expect, it } from 'vitest';
import { classifyAction, type StrategyRecommendation } from '../../src/modules/trainer/trainer.strategy.js';

const strategy: StrategyRecommendation = {
  version: 'test-v1',
  key: 'test',
  actions: [
    { action: { type: 'raise', amountBB: 2.5 }, frequency: 0.6 },
    { action: { type: 'call' }, frequency: 0.3 },
    { action: { type: 'check' }, frequency: 0.05 }
  ],
  assumptions: ['test'],
  factors: ['position']
};

describe('trainer evaluator', () => {
  it('classifies preferred, mixed, marginal, and significant deviations', () => {
    expect(classifyAction(strategy, { type: 'raise', amountBB: 2.5 })).toBe('PREFERRED');
    expect(classifyAction(strategy, { type: 'call' })).toBe('ACCEPTABLE_MIXED');
    expect(classifyAction(strategy, { type: 'check' })).toBe('MARGINAL');
    expect(classifyAction(strategy, { type: 'fold' })).toBe('SIGNIFICANT_DEVIATION');
  });
});
