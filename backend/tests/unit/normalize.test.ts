import { describe, it, expect } from 'vitest';
import { normalizeIdentifier } from '../../src/modules/auth/normalize.js';

describe('normalizeIdentifier', () => {
  it('lowercases and trims surrounding whitespace', () => {
    expect(normalizeIdentifier('  Trainer1@Example.com  ')).toBe('trainer1@example.com');
    expect(normalizeIdentifier('  SameName ')).toBe('samename');
  });

  it('treats case/whitespace variants as equal', () => {
    expect(normalizeIdentifier('Ana')).toBe(normalizeIdentifier(' ana '));
  });
});
