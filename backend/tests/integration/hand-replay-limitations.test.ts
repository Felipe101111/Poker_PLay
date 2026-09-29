import { describe, expect, it } from 'vitest';
import { projectReplay } from '../../src/modules/hand-history/hand-history.replay.js';
import { replayHandFixture } from '../helpers/hand-replay.js';

describe('hand replay limitation integration', () => {
  it('returns available events with explicit gaps and unavailable states', () => {
    const replay = projectReplay({ ...replayHandFixture({ actions: [{ ...replayHandFixture().actions[0], sequence: 3, publicStateAfter: null }] }), id: 'legacy-partial', sequenceVersion: 1, policies: [] } as never, 'user-1');
    expect(replay.events).toHaveLength(1);
    expect(replay.events[0].stateAfter).toBeNull();
    expect(replay.limitations.map(({ code }) => code)).toEqual(expect.arrayContaining(['LEGACY_GAP', 'UNAVAILABLE_STATE']));
  });

  it('projects an empty visible timeline explicitly', () => {
    const replay = projectReplay({ ...replayHandFixture({ actions: [] }), id: 'legacy-empty', sequenceVersion: 1, policies: [] } as never, 'user-1');
    expect(replay.events).toEqual([]);
    expect(replay.limitations.map(({ code }) => code)).toContain('NO_VISIBLE_EVENTS');
  });
});
