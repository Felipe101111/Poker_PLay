import { describe, expect, it } from 'vitest';
import { InMemoryStrategyRepository } from '../../../src/modules/strategy/strategy.repository.js';
import { StrategyService } from '../../../src/modules/strategy/strategy.service.js';

describe('Strategy Service', () => {
  it('returns a versioned row and explicit unavailable results', () => {
    const service = new StrategyService(new InMemoryStrategyRepository());
    service.publish({ id: 'dataset-1', version: 'preflop-v1', schemaVersion: '1', gameFormat: 'SIX_MAX_100BB_PREFLOP', street: 'preflop', tableSize: 6, stackAssumptions: ['100bb'], blindAssumptions: ['no ante'], source: 'test dataset', assumptions: ['bounded'], precision: 0.01, status: 'PUBLISHED', publishedAt: new Date().toISOString() }, [{ id: 'row-1', datasetVersionId: 'dataset-1', contextKey: 'BTN|AKs', range: null, actions: [{ action: { type: 'raise', amountBB: 2.5 }, frequency: 1 }], factors: ['position'], assumptions: ['test'], conditions: [] }]);
    expect(service.lookup({ datasetVersion: 'preflop-v1', contextKey: 'BTN|AKs', gameFormat: 'SIX_MAX_100BB_PREFLOP', street: 'preflop' }).availability).toBe('AVAILABLE');
    expect(service.lookup({ datasetVersion: 'preflop-v1', contextKey: 'missing', gameFormat: 'SIX_MAX_100BB_PREFLOP', street: 'preflop' })).toMatchObject({ availability: 'UNAVAILABLE', reason: 'NO_COMPATIBLE_STRATEGY_ROW' });
  });
});
