import { describe, expect, it } from 'vitest';
import { summarize } from '../../src/modules/hand-history/hand-history.analytics.js';

describe('hand analytics summary integration', () => {
  it('aggregates only the supplied authorized terminal projection without writes', () => {
    const result = summarize([{ id: 'one', format: 'CASH', status: 'COMPLETED', endedAt: new Date(), publicSnapshot: { analytics: { netResult: 5, evResult: 4, winEligible: true, won: true } }, policies: [{ userId: 'u', canList: true, canViewDetail: true }] }]);
    expect(result.summary.handsPlayed).toBe(1);
    expect(result.summary.netResult).toBe(5);
  });
});
