import { describe, expect, it } from 'vitest';
import { relatedHands } from '../../src/modules/hand-history/hand-history.analytics.js';

describe('hand analytics related hands integration', () => {
  it('returns a bounded privacy-safe projection', () => {
    const result = relatedHands([{ id: 'one', format: 'CASH', status: 'COMPLETED', endedAt: new Date(), publicSnapshot: { analytics: { vpipSelected: true } }, policies: [{ userId: 'u', canList: true, canViewDetail: true }] }], 1);
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('publicSnapshot');
    expect(result[0]?.canOpenReplay).toBe(true);
  });
});
