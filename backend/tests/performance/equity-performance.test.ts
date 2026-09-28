import { describe, expect, it } from 'vitest';
import { calculateEquity } from '../../src/modules/equity/equity.engine.js';
import { card, equityRequest, holding } from '../helpers/equity-strategy.js';

describe('equity performance sample', () => {
  it('calculates a representative flop query within the reference budget', () => {
    const request = equityRequest([{ id: 'hero', holding: holding(card('A', 's'), card('K', 's')) }, { id: 'villain', holding: holding(card('Q', 's'), card('J', 's')) }], [card('2', 'c'), card('7', 'd'), card('Q', 'c')]);
    const started = performance.now();
    const result = calculateEquity(request);
    expect(result.runoutsEvaluated).toBeGreaterThan(0);
    expect(performance.now() - started).toBeLessThan(2000);
  });
});
