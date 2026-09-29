import { describe, expect, it } from 'vitest';
import { projectDetail } from '../../src/modules/hand-history/hand-history.projection.js';

describe('hand history detail projection', () => {
  it('returns actions in sequence order', () => {
    const result = projectDetail({ id: 'h', sourceType: 'TRAINER', format: 'TEST', status: 'COMPLETED', startedAt: new Date(0), endedAt: new Date(1), publicSnapshot: {}, participants: [], actions: [{ sequence: 2, street: 'FLOP', seatNumber: 1, actionType: 'CHECK', amount: null, publicStateAfter: {} }, { sequence: 1, street: 'PREFLOP', seatNumber: 1, actionType: 'CALL', amount: 2, publicStateAfter: {} }] }, 'user');
    expect(result.actions.map((action) => action.sequence)).toEqual([1, 2]);
  });
});