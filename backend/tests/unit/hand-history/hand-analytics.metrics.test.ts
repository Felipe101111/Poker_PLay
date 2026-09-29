import { describe, expect, it } from 'vitest';
import { breakdown, decisionMetrics } from '../../../src/modules/hand-history/hand-history.analytics.js';

const record = (id: string, analytics: Record<string, unknown>) => ({ id, format: 'CASH', status: 'COMPLETED', endedAt: new Date('2026-01-01T12:00:00Z'), publicSnapshot: { analytics }, policies: [{ userId: 'u', canList: true, canViewDetail: true }] });

describe('hand analytics decision metrics', () => {
  it('calculates decision ratios with explicit denominators', () => {
    const result = decisionMetrics([record('1', { vpipEligible: true, vpipSelected: true, pfrEligible: true, pfrSelected: false, winEligible: true, won: true })]);
    expect(result.metrics.vpip).toMatchObject({ numerator: 1, denominator: 1, value: 1 });
    expect(result.metrics.pfr).toMatchObject({ numerator: 0, denominator: 1, value: 0 });
  });

  it('groups positions and public street observations', () => {
    const rows = breakdown([record('1', { position: 'BTN', streetMetrics: { FLOP: { vpipEligible: true, vpipSelected: true } } })], 'position');
    const streets = breakdown([record('1', { position: 'BTN', streetMetrics: { FLOP: { vpipEligible: true, vpipSelected: true } } })], 'street');
    expect(rows[0]?.key).toBe('BTN');
    expect(streets[0]?.key).toBe('FLOP');
  });
});
