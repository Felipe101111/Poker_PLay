import { describe, expect, it } from 'vitest';
import { normalizeRange } from '../../../src/modules/equity/range.service.js';
import { card } from '../../helpers/equity-strategy.js';

describe('range normalization', () => {
  it('returns an explicit normalization factor', () => {
    const result = normalizeRange({ label: 'weighted', combos: [
      { cards: [card('A', 's'), card('K', 's')], weight: 0.25 },
      { cards: [card('A', 'h'), card('K', 'h')], weight: 0.75 }
    ] });
    expect(result.normalizationFactor).toBe(1);
    expect(result.totalWeight).toBe(1);
  });
});
