import { describe, expect, it } from 'vitest';
import { parseHandHistoryQuery } from '../../../src/modules/hand-history/hand-history.validation.js';

describe('hand history validation contract', () => {
  it('defaults and bounds pagination', () => {
    expect(parseHandHistoryQuery({})).toMatchObject({ page: 1, pageSize: 25, sort: 'endedAt', direction: 'desc' });
    expect(() => parseHandHistoryQuery({ page: 0 })).toThrow();
    expect(() => parseHandHistoryQuery({ pageSize: 101 })).toThrow();
  });
});