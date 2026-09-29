import { describe, expect, it } from 'vitest';
import { summarize, trend } from '../../src/modules/hand-history/hand-history.analytics.js';

describe('hand analytics performance', () => {
  it('calculates a representative in-memory response within the target budget', () => {
    const records = Array.from({ length: 500 }, (_, index) => ({ id: String(index), format: 'CASH', status: 'COMPLETED', endedAt: new Date(2026, 0, 1 + (index % 30)), publicSnapshot: { analytics: { netResult: 1, evResult: 1, winEligible: true, won: index % 2 === 0 } }, policies: [{ userId: 'u', canList: true, canViewDetail: true }] }));
    const start = performance.now();
    summarize(records);
    trend(records);
    expect(performance.now() - start).toBeLessThan(2000);
  });
});
