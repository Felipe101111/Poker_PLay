import { describe, expect, it } from 'vitest';
import { summarize } from '../../src/modules/hand-history/hand-history.analytics.js';

describe('legacy analytics compatibility', () => {
  it('returns explicit unavailable values for snapshots without analytics', () => {
    const result = summarize([{ id: 'legacy', format: 'CASH', status: 'COMPLETED', endedAt: new Date(), publicSnapshot: { board: [] }, policies: [{ userId: 'u', canList: true, canViewDetail: true }] }]);
    expect(result.summary.netResult).toBeNull();
    expect(result.summary.evResult).toBeNull();
    expect(result.limitations.some((item) => item.code === 'DATA_UNAVAILABLE')).toBe(true);
  });
});
