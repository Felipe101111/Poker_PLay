import { describe, expect, it } from 'vitest';
import { projectDetail } from '../../src/modules/hand-history/hand-history.projection.js';

describe('hand history privacy projection', () => {
  it('keeps raw internal state out of action responses', () => {
    const detail = projectDetail({ id: 'h', sourceType: 'TRAINER', format: 'TEST', status: 'COMPLETED', startedAt: new Date(0), endedAt: new Date(1), publicSnapshot: {}, participants: [], actions: [{ sequence: 1, street: 'TERMINAL', seatNumber: null, actionType: 'TERMINAL', amount: null, publicStateAfter: { rawDeck: ['As'] } }] }, 'user');
    expect(detail.actions[0]).not.toHaveProperty('publicStateAfter');
  });
});