import { describe, expect, it } from 'vitest';
import { projectReplay } from '../../src/modules/hand-history/hand-history.replay.js';
import { replayHandFixture } from '../helpers/hand-replay.js';

describe('hand replay privacy projection', () => {
  it.each(['FULL_AUTHORIZED', 'PUBLIC_ONLY', 'ANONYMIZED'] as const)('projects %s without sensitive keys', (redactionProfile) => {
    const replay = projectReplay({ ...replayHandFixture(), id: redactionProfile, sequenceVersion: 1, policies: [{ userId: 'user-1', redactionProfile }] } as never, 'user-1');
    expect(JSON.stringify(replay).toLowerCase()).not.toMatch(/deck|holecards|userid|password/);
    if (redactionProfile === 'ANONYMIZED') expect(replay.limitations.some(({ code }) => code === 'ANONYMIZED_DATA')).toBe(true);
  });
});
