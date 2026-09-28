import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { calculateEquity } from '../../src/modules/equity/equity.engine.js';

describe('postflop performance', () => {
  it('records p50/p95 exact equity latency for representative streets', () => {
    const samples: number[] = [];
    for (const street of ['flop', 'turn', 'river'] as const) {
      const board = street === 'flop' ? [{ rank: '2', suit: 'c' }, { rank: '7', suit: 'd' }, { rank: 'Q', suit: 'c' }] : street === 'turn' ? [{ rank: '2', suit: 'c' }, { rank: '7', suit: 'd' }, { rank: 'Q', suit: 'c' }, { rank: '9', suit: 'h' }] : [{ rank: '2', suit: 'c' }, { rank: '7', suit: 'd' }, { rank: 'Q', suit: 'c' }, { rank: '9', suit: 'h' }, { rank: 'A', suit: 's' }];
      const started = performance.now();
      const result = calculateEquity({ street, board, participants: [{ id: 'hero', holding: { cards: [{ rank: 'K', suit: 's' }, { rank: 'K', suit: 'h' }] } }, { id: 'villain', holding: { cards: [{ rank: 'J', suit: 's' }, { rank: 'J', suit: 'h' }] } }], method: 'EXACT', precision: 0.01 });
      samples.push(performance.now() - started);
      expect(result.runoutsEvaluated).toBeGreaterThan(0);
    }
    samples.sort((left, right) => left - right);
    const p50 = samples[Math.floor(samples.length * 0.5)];
    const p95 = samples[Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1)];
    expect(p50).toBeGreaterThanOrEqual(0);
    expect(p95).toBeLessThan(2000);
  });
});
