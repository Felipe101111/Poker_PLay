import { describe, expect, it } from 'vitest';
import { calculateEquity } from '../../../src/modules/equity/equity.engine.js';
import { card, equityRequest, holding } from '../../helpers/equity-strategy.js';
import { expandRangeNotation } from '../../../src/modules/equity/range.parser.js';

describe('range equity', () => {
  it('filters blocked combos and calculates weighted range equity', () => {
    const combos = expandRangeNotation('AKs');
    const result = calculateEquity(equityRequest([
      { id: 'hero', holding: holding(card('Q', 's'), card('Q', 'h')) },
      { id: 'villain', range: { label: 'AKs', combos } }
    ], [card('A', 's'), card('7', 'h'), card('2', 'd')]));
    expect(result.blockedComboCount).toBeGreaterThan(0);
    expect(result.remainingWeight.villain).toBeGreaterThan(0);
  });
});
