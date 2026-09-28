import { describe, expect, it } from 'vitest';
import { InMemoryStrategyRepository } from '../../src/modules/strategy/strategy.repository.js';
import { StrategyService } from '../../src/modules/strategy/strategy.service.js';

describe('postflop evaluation integration', () => {
  it('resolves a versioned postflop manifest and complete context key', () => {
    const service = new StrategyService(new InMemoryStrategyRepository());
    const manifest = service.loadPostflopManifest();
    expect(manifest.version).toBe('postflop-v1');
    expect(service.postflopContextKey({ street: 'flop', position: 'SB', effectiveStackBB: 100, priorActions: [] })).toBe('flop:SIX_MAX_100BB_POSTFLOP:SB:100bb:checked-to-hero');
  });
});
