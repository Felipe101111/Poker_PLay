import { describe, expect, it } from 'vitest';
import { replayFixture } from './fixtures/hand-replay';

describe('hand replay privacy regression', () => {
  it('fixture contains only projected participant fields', () => {
    expect(JSON.stringify(replayFixture).toLowerCase()).not.toMatch(/deck|holecards|userid|password/);
  });
});
