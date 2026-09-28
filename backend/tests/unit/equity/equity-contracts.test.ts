import { describe, expect, it } from 'vitest';
import { calculateEquity } from '../../../src/modules/equity/equity.engine.js';
import { card, equityRequest, holding } from '../../helpers/equity-strategy.js';

describe('equity contract', () => {
  it('returns bounded participant probabilities and declared metadata', () => {
    const result = calculateEquity(equityRequest([
      { id: 'hero', holding: holding(card('A', 's'), card('A', 'h')) },
      { id: 'villain', holding: holding(card('K', 's'), card('K', 'h')) }
    ], [card('2', 'c'), card('7', 'd'), card('Q', 'c')]));
    expect(result.method).toBe('EXACT');
    expect(result.participants.every((participant) => participant.equity >= 0 && participant.equity <= 1)).toBe(true);
    expect(result.inputFingerprint).toHaveLength(64);
  });
});
