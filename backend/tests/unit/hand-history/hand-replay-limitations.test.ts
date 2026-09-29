import { describe, expect, it } from 'vitest';
import { projectReplay } from '../../../src/modules/hand-history/hand-history.replay.js';
import { replayHandFixture } from '../../helpers/hand-replay.js';

describe('hand replay limitation codes', () => {
  it('reports no visible events without inventing state', () => {
    const replay = projectReplay({ ...replayHandFixture({ actions: [] }), id: 'empty', sequenceVersion: 1, policies: [] } as never, 'user-1');
    expect(replay.events).toHaveLength(0);
    expect(replay.limitations.some(({ code }) => code === 'NO_VISIBLE_EVENTS')).toBe(true);
    expect(replay.terminalState).toBeTruthy();
  });

  it('reports an unavailable event state and a legacy gap', () => {
    const replay = projectReplay({ ...replayHandFixture({ actions: [{ ...replayHandFixture().actions[0], sequence: 3, publicStateAfter: null }] }), id: 'partial', sequenceVersion: 1, policies: [] } as never, 'user-1');
    expect(replay.events[0].stateAfter).toBeNull();
    expect(replay.limitations.map(({ code }) => code)).toEqual(expect.arrayContaining(['UNAVAILABLE_STATE', 'LEGACY_GAP']));
  });
});
