import { describe, expect, it } from 'vitest';
import { calculateEquity } from '../../../src/modules/equity/equity.engine.js';

describe('Equity validation', () => {
  it('rejects a board with the wrong street card count', () => {
    expect(() => calculateEquity({ street: 'flop', board: [], method: 'EXACT', precision: 0.001, participants: [] })).toThrow();
  });

  it('rejects duplicate cards across the board and a holding', () => {
    expect(() => calculateEquity({ street: 'flop', board: [{ rank: 'A', suit: 's' }, { rank: '7', suit: 'h' }, { rank: '2', suit: 'd' }], method: 'EXACT', precision: 0.001, participants: [
      { id: 'hero', holding: { cards: [{ rank: 'A', suit: 's' }, { rank: 'K', suit: 's' }] } },
      { id: 'villain', holding: { cards: [{ rank: 'Q', suit: 's' }, { rank: 'J', suit: 's' }] } }
    ] })).toThrow();
  });
});
