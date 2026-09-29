import { describe, expect, it } from 'vitest';
import { compatibilityKey, validateStrategyRows } from '../../../src/modules/strategy/strategy.admin.validation.js';

const metadata = { version: 'v1', schemaVersion: '1', gameFormat: 'SIX_MAX_100BB_POSTFLOP', street: 'flop' as const, tableSize: 6, stackAssumptions: ['100bb'], blindAssumptions: ['no-ante'], source: 'test', assumptions: [], precision: 0.000001 };
const row = { contextKey: 'flop|BTN|100bb|checked-to-hero', range: null, actions: [{ action: { type: 'check' as const }, frequency: 1 }], factors: [], assumptions: [], conditions: [] };

describe('strategy administration validation', () => {
  it('reports empty, duplicate, and non-normalized drafts', () => {
    expect(validateStrategyRows([], metadata, 'user').issues.some((issue) => issue.code === 'DRAFT_EMPTY')).toBe(true);
    const report = validateStrategyRows([row, { ...row }], metadata, 'user');
    expect(report.issues.some((issue) => issue.code === 'DUPLICATE_CONTEXT')).toBe(true);
    expect(validateStrategyRows([{ ...row, actions: [{ action: { type: 'check' }, frequency: 0.8 }] }], metadata, 'user').status).toBe('FAILED');
  });

  it('canonicalizes compatible assumptions into a stable key', () => {
    expect(compatibilityKey('dataset', metadata)).toBe(compatibilityKey('dataset', { ...metadata, stackAssumptions: ['100bb'], blindAssumptions: ['no-ante'] }));
  });
});
