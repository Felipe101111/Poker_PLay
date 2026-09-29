import { describe, expect, it } from 'vitest';
import { parseHandHistoryQuery } from '../../src/modules/hand-history/hand-history.validation.js';

describe('hand history filter semantics', () => {
  it('keeps date ranges ordered and pagination bounded', () => {
    expect(parseHandHistoryQuery({ from: '2026-09-28T00:00:00.000Z', to: '2026-09-29T00:00:00.000Z', page: 2, pageSize: 10 })).toMatchObject({ page: 2, pageSize: 10 });
  });
});