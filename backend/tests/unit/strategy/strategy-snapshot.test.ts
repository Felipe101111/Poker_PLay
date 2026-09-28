import { describe, expect, it } from 'vitest';
import { createEvaluationSnapshot } from '../../../src/modules/strategy/strategy.snapshot.js';

describe('evaluation snapshots', () => {
  it('copies context and result data into an immutable-shaped historical record', () => {
    const context = { street: 'preflop' as const, gameFormat: 'SIX_MAX_100BB_PREFLOP', heroCards: [], board: [], tableSize: 6, effectiveStackBB: 100, priorActions: [], calculationConfig: { method: 'EXACT' as const, precision: 0.001 } };
    const snapshot = createEvaluationSnapshot({ id: 'e1', context, equity: { equity: 0.5 }, availability: 'UNAVAILABLE' });
    expect(snapshot).toMatchObject({ id: 'e1', availability: 'UNAVAILABLE', contextSnapshot: context });
    expect(snapshot.contextSnapshot).not.toBe(context);
  });
});
