import { describe, it, expect } from 'vitest';
import { normalizePair } from '../../src/modules/friends/normalize-pair.js';

describe('normalizePair', () => {
  it('sorts the two ids lexicographically', () => {
    expect(normalizePair('b', 'a')).toEqual({ userLowId: 'a', userHighId: 'b' });
    expect(normalizePair('a', 'b')).toEqual({ userLowId: 'a', userHighId: 'b' });
  });

  it('is symmetric regardless of argument order', () => {
    const idA = '11111111-1111-1111-1111-111111111111';
    const idB = '22222222-2222-2222-2222-222222222222';
    expect(normalizePair(idA, idB)).toEqual(normalizePair(idB, idA));
  });
});
