import { describe, expect, it } from 'vitest';
import { projectSummary } from '../../src/modules/hand-history/hand-history.projection.js';

describe('hand history security contract', () => {
  it('does not project arbitrary snapshot keys', () => {
    const summary = projectSummary({ id: 'h', sourceType: 'TRAINER', format: 'TEST', status: 'COMPLETED', startedAt: new Date(0), endedAt: new Date(1), publicSnapshot: { rawDeck: ['As'], privateCards: ['Kd'] }, participants: [] });
    expect(summary).not.toHaveProperty('rawDeck');
    expect(summary).not.toHaveProperty('privateCards');
  });
});