import { describe, expect, it } from 'vitest';
import { InMemoryStrategyRepository } from '../../../src/modules/strategy/strategy.repository.js';
import { StrategyService } from '../../../src/modules/strategy/strategy.service.js';

describe('strategy lookup', () => {
  it('isolates versions and does not fabricate missing rows', () => {
    const service = new StrategyService(new InMemoryStrategyRepository());
    service.publish({ id: 'v1', version: 'v1', schemaVersion: '1', gameFormat: 'SIX_MAX_100BB_PREFLOP', street: 'preflop', tableSize: 6, stackAssumptions: [], blindAssumptions: [], source: 'test', assumptions: [], precision: 0.01, status: 'PUBLISHED', publishedAt: new Date().toISOString() }, [{ id: 'r1', datasetVersionId: 'v1', contextKey: 'BTN|AKs', range: null, actions: [{ action: { type: 'raise' }, frequency: 1 }], factors: [], assumptions: [], conditions: [] }]);
    service.retire('v1');
    expect(service.lookup({ datasetVersion: 'v1', contextKey: 'BTN|AKs', gameFormat: 'SIX_MAX_100BB_PREFLOP', street: 'preflop' })).toMatchObject({ availability: 'AVAILABLE', dataset: { status: 'RETIRED' } });
    expect(service.lookup({ datasetVersion: 'v1', contextKey: 'CO|72o', gameFormat: 'SIX_MAX_100BB_PREFLOP', street: 'preflop' })).toMatchObject({ availability: 'UNAVAILABLE' });
  });
});
