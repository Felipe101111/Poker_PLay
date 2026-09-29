import { describe, expect, it } from 'vitest';
import { decisionMetrics } from '../../src/modules/hand-history/hand-history.analytics.js';

describe('hand analytics metrics integration', () => {
  it('keeps metrics limited to public observations', () => {
    const result = decisionMetrics([{ id: 'one', format: 'CASH', status: 'COMPLETED', endedAt: new Date(), publicSnapshot: { analytics: { vpipEligible: true, vpipSelected: true } }, policies: [{ userId: 'u', canList: true, canViewDetail: true }] }]);
    expect(result.metrics.vpip.numerator).toBe(1);
    expect(result.metrics.winRate.denominator).toBe(0);
  });
});
