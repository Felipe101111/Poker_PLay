import { describe, expect, it } from 'vitest';
import { validateStrategyRow } from '../../../src/modules/strategy/strategy.validation.js';

describe('strategy validation', () => {
  it('requires normalized action frequencies', () => {
    expect(() => validateStrategyRow({ id: 'row', datasetVersionId: 'v1', contextKey: 'BTN|AKs', range: null, actions: [{ action: { type: 'raise' }, frequency: 0.8 }], factors: [], assumptions: [], conditions: [] })).toThrow();
  });
});
