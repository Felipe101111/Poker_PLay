import { describe, expect, it } from 'vitest';
import { projectReplay } from '../../src/modules/hand-history/hand-history.replay.js';
import { replayHandFixture } from '../helpers/hand-replay.js';

describe('hand replay readonly behavior', () => {
  it('does not mutate the source history while projecting', () => {
    const source = { ...replayHandFixture(), id: 'history-readonly', sequenceVersion: 1, policies: [] } as never;
    const before = JSON.stringify(source);
    projectReplay(source, 'user-1');
    expect(JSON.stringify(source)).toBe(before);
  });
});
