import { describe, expect, it } from 'vitest';
import { decisionMetrics, metric, summarize, trend } from '../../../src/modules/hand-history/hand-history.analytics.js';
import { parseAnalyticsQuery } from '../../../src/modules/hand-history/hand-history.validation.js';

function record(id: string, day: string, analytics?: Record<string, unknown>) {
  return { id, format: 'SIX_MAX_100BB', status: 'COMPLETED', endedAt: new Date(`${day}T12:00:00.000Z`), publicSnapshot: analytics ? { analytics } : {}, policies: [{ userId: 'user-1', canList: true, canViewDetail: true }] };
}

describe('hand analytics foundation', () => {
  it('validates defaults and rejects invalid ranges and limits', () => {
    expect(parseAnalyticsQuery({})).toEqual({ relatedLimit: 20 });
    expect(() => parseAnalyticsQuery({ from: '2026-02-02T00:00:00.000Z', to: '2026-02-01T00:00:00.000Z' })).toThrow();
    expect(() => parseAnalyticsQuery({ relatedLimit: 51 })).toThrow();
  });

  it('keeps ratios null for zero denominators and marks small samples', () => {
    expect(metric(0, 0)).toMatchObject({ value: null, isSufficient: false });
    expect(metric(2, 2)).toMatchObject({ value: 1, isSufficient: false });
  });

  it('calculates summary without fabricating unavailable results', () => {
    const result = summarize([record('one', '2026-01-01', { netResult: 10, evResult: 8, winEligible: true, won: true })]);
    expect(result.summary).toMatchObject({ handsPlayed: 1, netResult: 10, evResult: 8, netResultAvailable: true, evAvailable: true });
    expect(result.limitations.some((item) => item.code === 'INSUFFICIENT_SAMPLE')).toBe(true);
    expect(summarize([record('missing', '2026-01-01')]).summary.netResult).toBeNull();
  });

  it('orders trend points and reports unavailable observations', () => {
    const result = trend([record('two', '2026-01-02', { netResult: 2 }), record('one', '2026-01-01', { netResult: 1 })]);
    expect(result.map((point) => point.periodStart)).toEqual(['2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z']);
    expect(decisionMetrics([record('missing', '2026-01-01')]).limitations.some((item) => item.code === 'DATA_UNAVAILABLE')).toBe(true);
  });
});
