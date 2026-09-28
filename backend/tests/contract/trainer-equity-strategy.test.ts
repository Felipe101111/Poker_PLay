import { describe, expect, it } from 'vitest';
import { evaluateTrainerScenario } from '../../src/modules/trainer/trainer.evaluation.js';
import { card } from '../helpers/equity-strategy.js';

describe('Trainer unavailable equity and strategy contract', () => {
  it('returns unavailable without fabricating strategy or equity', () => {
    const result = evaluateTrainerScenario({ street: 'preflop', gameFormat: 'SIX_MAX_100BB_PREFLOP', heroCards: [card('A', 's'), card('K', 's')], board: [], position: 'BTN', tableSize: 6, effectiveStackBB: 100, priorActions: [], calculationConfig: { method: 'EXACT', precision: 0.001 }, opponentHoldings: [] }, () => null);
    expect(result.availability).toBe('UNAVAILABLE');
    expect(result.equity).toBeNull();
    expect(result.strategy).toBeNull();
  });
});
