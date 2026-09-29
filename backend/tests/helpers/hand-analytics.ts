import type { TerminalHandSnapshot } from '../../src/modules/hand-history/hand-history.types.js';

export function analyticsHandFixture(overrides: Partial<TerminalHandSnapshot> = {}): TerminalHandSnapshot {
  return {
    sourceType: 'TRAINER', sourceId: `analytics-${Date.now()}`, status: 'COMPLETED', format: 'SIX_MAX_100BB', startedAt: '2026-01-01T12:00:00.000Z', endedAt: '2026-01-01T12:05:00.000Z', publicSnapshot: { analytics: { netResult: 10, evResult: 8, vpipEligible: true, vpipSelected: true, pfrEligible: true, pfrSelected: true, winEligible: true, won: true, position: 'BTN' } }, participants: [{ userId: 'user-1', seatNumber: 1, displayName: 'Player' }], actions: [], ...overrides
  };
}
