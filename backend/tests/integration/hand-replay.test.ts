import { describe, expect, it } from 'vitest';
import { projectReplay } from '../../src/modules/hand-history/hand-history.replay.js';
import { replayHandFixture } from '../helpers/hand-replay.js';

describe('hand replay integration projection', () => {
  it.each(['LOCAL_GAME', 'MULTIPLAYER', 'TRAINER'] as const)('opens a terminal %s record', (sourceType) => {
    const replay = projectReplay({
      ...replayHandFixture({ sourceType }),
      id: `history-${sourceType}`,
      sequenceVersion: 1,
      policies: [{ userId: 'user-1', redactionProfile: 'FULL_AUTHORIZED' }]
    } as never, 'user-1');
    expect(replay.historyId).toBe(`history-${sourceType}`);
    expect(replay.events.length).toBeGreaterThan(0);
    expect(replay.status).toBe('COMPLETED');
  });
});
