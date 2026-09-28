import { describe, expect, it } from 'vitest';
import { InMemoryStrategyRepository } from '../../src/modules/strategy/strategy.repository.js';
import { StrategyService } from '../../src/modules/strategy/strategy.service.js';

describe('strategy versioning', () => {
  it('prevents publication mutation and preserves retirement reads', () => {
    const service = new StrategyService(new InMemoryStrategyRepository());
    const version = { id: 'v1', version: 'v1', schemaVersion: '1', gameFormat: 'SIX_MAX_100BB_PREFLOP', street: 'preflop' as const, tableSize: 6, stackAssumptions: [], blindAssumptions: [], source: 'test', assumptions: [], precision: 0.01, status: 'PUBLISHED' as const, publishedAt: new Date().toISOString() };
    service.publish(version, [{ id: 'r1', datasetVersionId: 'v1', contextKey: 'BTN|AKs', range: null, actions: [{ action: { type: 'raise' }, frequency: 1 }], factors: [], assumptions: [], conditions: [] }]);
    expect(() => service.publish(version, [])).toThrow();
    service.retire('v1');
    expect(service.lookup({ datasetVersion: 'v1', contextKey: 'BTN|AKs', gameFormat: version.gameFormat, street: 'preflop' }).availability).toBe('AVAILABLE');
  });
});
