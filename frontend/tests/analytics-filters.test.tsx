import { describe, expect, it } from 'vitest';
import { filtersFromParams, paramsFromFilters } from '../src/pages/analyticsState';

describe('analytics filters', () => {
  it('round trips URL filters', () => {
    const params = paramsFromFilters({ from: '2026-01-01T00:00:00.000Z', format: 'CASH' });
    expect(filtersFromParams(params)).toMatchObject({ from: '2026-01-01T00:00:00.000Z', format: 'CASH' });
  });
});
