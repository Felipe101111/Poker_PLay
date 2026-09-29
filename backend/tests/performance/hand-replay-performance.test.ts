import { describe, expect, it } from 'vitest';
import { projectReplay } from '../../src/modules/hand-history/hand-history.replay.js';
import { replayHandFixture } from '../helpers/hand-replay.js';

describe('hand replay projection performance', () => {
  it('projects a representative timeline without excessive work', () => {
    const fixture = replayHandFixture({ actions: Array.from({ length: 100 }, (_, index) => ({ sequence: index + 1, street: 'FLOP', seatNumber: 1, actionType: 'BET', amount: 1, publicStateAfter: { pot: index + 1 }, occurredAt: '2026-09-28T12:01:00.000Z' })) });
    const started = performance.now();
    const replay = projectReplay({ ...fixture, id: 'performance', sequenceVersion: 1, policies: [] } as never, 'user-1');
    expect(replay.events).toHaveLength(100);
    expect(performance.now() - started).toBeLessThan(250);
  });
});
