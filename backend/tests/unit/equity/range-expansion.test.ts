import { describe, expect, it } from 'vitest';
import { expandRangeNotation } from '../../../src/modules/equity/range.parser.js';

describe('range expansion', () => {
  it('expands pair, suited, and offsuit classes', () => {
    expect(expandRangeNotation('AA')).toHaveLength(6);
    expect(expandRangeNotation('AKs')).toHaveLength(4);
    expect(expandRangeNotation('AKo')).toHaveLength(12);
  });
});
