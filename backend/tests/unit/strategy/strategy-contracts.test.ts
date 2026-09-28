import { describe, expect, it } from 'vitest';
import { InMemoryStrategyRepository } from '../../../src/modules/strategy/strategy.repository.js';
import { StrategyService } from '../../../src/modules/strategy/strategy.service.js';

describe('strategy contract', () => {
  it('loads a documented manifest and preserves unavailable semantics', () => {
    const service = new StrategyService(new InMemoryStrategyRepository());
    expect(service.loadManifest()).toMatchObject({ version: 'preflop-v1', status: 'PUBLISHED' });
    expect(service.lookup({ datasetVersion: 'missing', contextKey: 'x', gameFormat: 'SIX_MAX_100BB_PREFLOP', street: 'preflop' })).toMatchObject({ availability: 'UNAVAILABLE' });
  });
});
