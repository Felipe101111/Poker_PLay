import { describe, expect, it } from 'vitest';
import { projectReplay } from '../../../src/modules/hand-history/hand-history.replay.js';
import { replayHandFixture } from '../../helpers/hand-replay.js';

describe('hand replay limitations', () => {
  it('reports unavailable state and legacy gaps without exposing raw sensitive keys', () => {
    const snapshot = replayHandFixture({
      actions: [{ sequence: 3, actionType: 'BET', street: 'FLOP', seatNumber: 1, amount: 10, occurredAt: '2025-01-01T00:00:01.000Z', publicStateAfter: null }],
    });
    const record = {
      id: 'history-1', sourceType: snapshot.sourceType, format: snapshot.format, status: snapshot.status,
      sequenceVersion: 1, publicSnapshot: snapshot.publicSnapshot,
      participants: snapshot.participants.map((participant) => ({ ...participant, displayNameSnapshot: participant.displayName, visibility: 'VISIBLE' })),
      actions: snapshot.actions, policies: []
    } as never;
    const replay = projectReplay(record, 'viewer');
    expect(replay.events[0].limitation?.code).toBe('UNAVAILABLE_STATE');
    expect(replay.limitations.map(({ code }) => code)).toEqual(expect.arrayContaining(['UNAVAILABLE_STATE', 'LEGACY_GAP']));
    expect(JSON.stringify(replay)).not.toContain('secret-token');
  });
});
