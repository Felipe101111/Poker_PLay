import { describe, expect, it } from 'vitest';
import { evaluateTrainerScenario } from '../../src/modules/trainer/trainer.evaluation.js';
import { card } from '../helpers/equity-strategy.js';

describe('Trainer equity and strategy integration', () => {
  it('keeps exact equity and strategy outputs separate', () => {
    const result = evaluateTrainerScenario({ street: 'flop', gameFormat: 'SIX_MAX_100BB_PREFLOP', heroCards: [card('A', 's'), card('K', 's')], board: [card('2', 'c'), card('7', 'd'), card('Q', 'c')], position: 'BTN', tableSize: 2, effectiveStackBB: 100, priorActions: [], calculationConfig: { method: 'EXACT', precision: 0.001 }, opponentHoldings: [{ cards: [card('Q', 's'), card('J', 's')] }] }, () => ({ version: 'preflop-v1', key: 'BTN', actions: [{ action: { type: 'raise' }, frequency: 1 }], assumptions: ['test'], factors: ['position'] }));
    expect(result.equity?.method).toBe('EXACT');
    expect(result.strategy?.version).toBe('preflop-v1');
    expect(result.limitations).toEqual([]);
  });
});
