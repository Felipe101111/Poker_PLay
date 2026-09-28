import { describe, expect, it } from 'vitest';
import { card } from '../../helpers/equity-strategy.js';
import { expandRangeNotation } from '../../../src/modules/equity/range.parser.js';
import { filterBlockedCombos } from '../../../src/modules/equity/range.service.js';

describe('range blockers', () => {
  it('reports removed combos and remaining weight', () => {
    const result = filterBlockedCombos({ label: 'AKs', combos: expandRangeNotation('AKs') }, [card('A', 's')]);
    expect(result.removedComboCount).toBe(1);
    expect(result.remainingWeight).toBe(3);
  });
});
