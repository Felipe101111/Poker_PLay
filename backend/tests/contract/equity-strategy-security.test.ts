import { describe, expect, it } from 'vitest';
import { projectEquityResult } from '../../src/modules/equity/equity.projection.js';

describe('equity strategy security', () => {
  it('projects only public calculation fields', () => {
    const projected = projectEquityResult({ method: 'EXACT', precision: 0.001, runoutsEvaluated: 1, participants: [{ id: 'hero', winProbability: 1, equity: 1 }], tieProbability: 0, blockedComboCount: 0, remainingWeight: {}, inputFingerprint: 'hash', deck: [{ rank: 'A', suit: 's' }] } as never);
    expect(projected).not.toHaveProperty('deck');
    expect(projected).toHaveProperty('inputFingerprint', 'hash');
  });
});
