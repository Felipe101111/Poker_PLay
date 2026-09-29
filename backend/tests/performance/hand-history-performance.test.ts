import { describe, expect, it } from 'vitest';
import { parseHandHistoryQuery } from '../../src/modules/hand-history/hand-history.validation.js';

describe('hand history query performance guard', () => {
  it('validates a representative first-page query within the target budget', () => {
    const started = performance.now();
    for (let index = 0; index < 1000; index += 1) parseHandHistoryQuery({ page: 1, pageSize: 25, direction: 'desc' });
    expect(performance.now() - started).toBeLessThan(1000);
  });
});