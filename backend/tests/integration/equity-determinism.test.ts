import { describe, expect, it } from 'vitest';
import { calculateEquity } from '../../src/modules/equity/equity.engine.js';
import { card, equityRequest, holding } from '../helpers/equity-strategy.js';

describe('equity determinism', () => {
  it('returns the same normalized result for repeated requests', () => {
    const request = equityRequest([
      { id: 'hero', holding: holding(card('A', 's'), card('K', 's')) },
      { id: 'villain', holding: holding(card('Q', 's'), card('J', 's')) }
    ], [card('2', 'c'), card('7', 'd'), card('Q', 'c')]);
    expect(calculateEquity(request)).toEqual(calculateEquity(request));
  });
});
