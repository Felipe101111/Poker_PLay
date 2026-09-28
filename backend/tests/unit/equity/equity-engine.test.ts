import { describe, expect, it } from 'vitest';
import { calculateEquity } from '../../../src/modules/equity/equity.engine.js';

describe('Equity Engine', () => {
  it('calculates a deterministic preflop result for two holdings', () => {
    const request = { street: 'flop', board: [{ rank: '2', suit: 'c' }, { rank: '7', suit: 'd' }, { rank: 'Q', suit: 'c' }], method: 'EXACT', precision: 0.000001, participants: [
      { id: 'hero', holding: { cards: [{ rank: 'A', suit: 's' }, { rank: 'A', suit: 'h' }] } },
      { id: 'villain', holding: { cards: [{ rank: 'K', suit: 's' }, { rank: 'K', suit: 'h' }] } }
    ] } as const;
    const result = calculateEquity(request);
    expect(result.method).toBe('EXACT');
    expect(result.runoutsEvaluated).toBeGreaterThan(0);
    expect(result.participants[0].equity).toBeGreaterThan(result.participants[1].equity);
    expect(calculateEquity(request).inputFingerprint).toBe(result.inputFingerprint);
  });

  it('rejects duplicate cards', () => {
    expect(() => calculateEquity({ street: 'flop', board: [{ rank: 'A', suit: 's' }, { rank: 'A', suit: 's' }, { rank: '2', suit: 'd' }], method: 'EXACT', precision: 0.001, participants: [] })).toThrow();
  });
});
