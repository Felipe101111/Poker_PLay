import { describe, expect, it } from 'vitest';
import { projectReplay } from '../../../src/modules/hand-history/hand-history.replay.js';

describe('hand replay projection', () => {
  it('returns ordered states without sensitive snapshot fields', () => {
    const record = {
      id: 'history-1', sourceType: 'TRAINER', format: 'TEST', status: 'COMPLETED', sequenceVersion: 1,
      publicSnapshot: { initialState: { board: [], pot: 0, rawDeck: ['2c'] }, board: ['Ah'], pot: 10, result: 'WON', rawDeck: ['2c'], opponentCards: ['Ks'] },
      participants: [{ seatNumber: 1, userId: 'user-1', displayNameSnapshot: 'Player', visibility: 'PARTICIPANT' }],
      policies: [{ userId: 'user-1', redactionProfile: 'FULL_AUTHORIZED' as const }],
      actions: [
        { sequence: 2, street: 'TERMINAL', seatNumber: 1, actionType: 'TERMINAL', amount: null, publicStateAfter: { pot: 10, rawDeck: ['2c'] }, occurredAt: new Date('2026-09-28T12:02:00Z') },
        { sequence: 1, street: 'PREFLOP', seatNumber: 1, actionType: 'CALL', amount: 2, publicStateAfter: { pot: 5 }, occurredAt: new Date('2026-09-28T12:01:00Z') }
      ]
    };
    const replay = projectReplay(record, 'user-1');
    expect(replay.events.map((event) => event.sequence)).toEqual([1, 2]);
    expect(replay.initialState).not.toHaveProperty('rawDeck');
    expect(replay.events[1].stateAfter).not.toHaveProperty('rawDeck');
    expect(replay.terminalState).not.toHaveProperty('opponentCards');
    expect(record.actions).toHaveLength(2);
  });
});
