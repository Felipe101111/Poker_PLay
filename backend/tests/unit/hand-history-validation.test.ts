import { describe, expect, it } from 'vitest';
import { parseHandHistoryQuery } from '../../src/modules/hand-history/hand-history.validation.js';

describe('hand history query validation', () => {
  it('applies bounded defaults', () => {
    expect(parseHandHistoryQuery({})).toMatchObject({ page: 1, pageSize: 25, sort: 'endedAt', direction: 'desc' });
  });

  it('rejects invalid ranges and page sizes', () => {
    expect(() => parseHandHistoryQuery({ pageSize: 101 })).toThrow();
    expect(() => parseHandHistoryQuery({ from: '2026-09-29T00:00:00.000Z', to: '2026-09-28T00:00:00.000Z' })).toThrow();
  });
});