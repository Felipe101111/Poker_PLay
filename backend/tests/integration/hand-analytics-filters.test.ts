import { describe, expect, it } from 'vitest';
import { parseAnalyticsQuery } from '../../src/modules/hand-history/hand-history.validation.js';

describe('hand analytics filters integration', () => {
  it('normalizes one filter scope for every downstream section', () => {
    const filters = parseAnalyticsQuery({ from: '2026-01-01T00:00:00.000Z', to: '2026-01-31T23:59:59.999Z', format: 'CASH', relatedLimit: 10 });
    expect(filters.relatedLimit).toBe(10);
    expect(filters.format).toBe('CASH');
  });
});
