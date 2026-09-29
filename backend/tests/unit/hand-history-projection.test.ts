import { describe, expect, it } from 'vitest';
import { projectDetail, projectSummary } from '../../src/modules/hand-history/hand-history.projection.js';

const record = {
  id: 'history-1', sourceType: 'TRAINER', format: 'SIX_MAX_100BB', status: 'COMPLETED', startedAt: new Date('2026-09-28T12:00:00Z'), endedAt: new Date('2026-09-28T12:05:00Z'),
  publicSnapshot: { board: ['Ah'], pot: 20, result: 'WON', rawDeck: ['2c'], opponentCards: ['Ks'] },
  participants: [{ seatNumber: 1, userId: 'user-1', displayNameSnapshot: 'Player', visibility: 'PARTICIPANT' }, { seatNumber: 2, userId: 'user-2', displayNameSnapshot: 'Opponent', visibility: 'ANONYMIZED' }],
  actions: [{ sequence: 2, street: 'FLOP', seatNumber: 2, actionType: 'CHECK', amount: null, publicStateAfter: { rawDeck: ['2c'] } }, { sequence: 1, street: 'PREFLOP', seatNumber: 1, actionType: 'CALL', amount: 2, publicStateAfter: {} }]
};

describe('hand history projection', () => {
  it('returns summary fields without internal snapshot data', () => {
    const summary = projectSummary(record);
    expect(summary.summary).toEqual({ board: ['Ah'], pot: 20, result: 'WON', participantCount: 2 });
    expect(summary).not.toHaveProperty('rawDeck');
  });

  it('orders actions and anonymizes other participants', () => {
    const detail = projectDetail(record, 'user-1');
    expect(detail.actions.map((action) => action.sequence)).toEqual([1, 2]);
    expect(detail.participants[1]).toMatchObject({ displayName: 'Anonymous player', isViewer: false });
    expect(detail.actions[0]).not.toHaveProperty('publicStateAfter');
  });
});