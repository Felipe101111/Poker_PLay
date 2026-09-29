export const replayFixture = {
  replay: {
    historyId: 'history-1',
    sourceType: 'TRAINER',
    format: 'SIX_MAX_100BB',
    status: 'COMPLETED',
    sequenceVersion: 1,
    initialState: { board: [], pot: 3, participants: [{ seatNumber: 1, displayName: 'You', isViewer: true }] },
    events: [
      { sequence: 1, street: 'PREFLOP', seatNumber: 1, actionType: 'CALL', amount: 2, occurredAt: '2026-09-28T12:01:00.000Z', stateAfter: { board: [], pot: 5 } },
      { sequence: 2, street: 'TERMINAL', seatNumber: 1, actionType: 'TERMINAL', amount: null, occurredAt: '2026-09-28T12:05:00.000Z', stateAfter: { board: ['Ah', '7d', '2c'], pot: 5, result: 'WON' } }
    ],
    terminalState: { board: ['Ah', '7d', '2c'], pot: 5, result: 'WON' },
    limitations: []
  }
};