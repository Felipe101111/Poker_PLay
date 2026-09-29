import { describe, expect, it } from 'vitest';
import { paramsFromFilters } from '../src/pages/analyticsState';

describe('analytics related hands', () => {
  it('preserves filter context in navigation parameters', () => {
    expect(paramsFromFilters({ format: 'CASH' }).get('format')).toBe('CASH');
  });
});
