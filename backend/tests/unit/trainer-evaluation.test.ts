import { describe, expect, it } from 'vitest';
import { evaluateTrainerScenario } from '../../src/modules/trainer/trainer.evaluation.js';
import { card } from '../helpers/equity-strategy.js';

describe('trainer evaluation policy', () => {
  it('declares multiway exact equity unavailable instead of approximating', () => {
    const result = evaluateTrainerScenario({ street: 'flop', gameFormat: 'SIX_MAX_100BB_PREFLOP', heroCards: [card('A', 's'), card('K', 's')], board: [card('2', 'c'), card('7', 'd'), card('Q', 'c')], tableSize: 6, effectiveStackBB: 100, priorActions: [], calculationConfig: { method: 'EXACT', precision: 0.001 }, opponentHoldings: [{ cards: [card('Q', 's'), card('J', 's')] }, { cards: [card('8', 's'), card('8', 'h')] }] }, () => null);
    expect(result.equity).toBeNull();
    expect(result.limitations[0]).toMatch(/multiway/);
  });
});
