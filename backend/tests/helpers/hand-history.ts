import type { TerminalHandSnapshot } from '../../src/modules/hand-history/hand-history.types.js';

export function terminalHandFixture(overrides: Partial<TerminalHandSnapshot> = {}): TerminalHandSnapshot {
  return {
    sourceType: 'TRAINER', sourceId: `fixture-${Date.now()}`, status: 'COMPLETED', format: 'SIX_MAX_100BB', startedAt: '2026-09-28T12:00:00.000Z', endedAt: '2026-09-28T12:05:00.000Z', publicSnapshot: { board: ['Ah', '7d', '2c'], pot: 20, result: 'WON', revealedCards: [], limitations: [] },
    participants: [{ userId: 'user-1', seatNumber: 1, displayName: 'Player' }, { userId: 'user-2', seatNumber: 2, displayName: 'Opponent' }],
    actions: [{ sequence: 1, street: 'PREFLOP', seatNumber: 1, actionType: 'CALL', amount: 2, occurredAt: '2026-09-28T12:01:00.000Z' }],
    ...overrides
  };
}