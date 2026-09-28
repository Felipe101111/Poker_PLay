import { describe, expect, it } from 'vitest';
import { projectEquityResult } from '../../src/modules/equity/equity.projection.js';

describe('Trainer equity regression boundary', () => {
  it('keeps private calculation internals out of the public projection', () => {
    const result = projectEquityResult({ method: 'EXACT', precision: 0.001, runoutsEvaluated: 4, participants: [], tieProbability: 0, blockedComboCount: 0, remainingWeight: {}, inputFingerprint: 'stable', privateDeck: true } as never);
    expect(result).not.toHaveProperty('privateDeck');
  });
});
