import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';
import { registerAndLoginLocalGame } from '../helpers/localGames.js';

const app = buildTestApp();

describe('local game all-in flow', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('deals through the remaining streets after every seat is all-in', async () => {
    const agent = await registerAndLoginLocalGame('allin@example.com', 'PokerAllIn');
    await agent.post('/api/local-games').send({ seatCount: 3, startingStackBB: 2 });

    let state = (await agent.get('/api/local-games/current?asSeat=1')).body;
    for (let attempt = 0; attempt < 20 && state.bettingRound !== 'complete'; attempt++) {
      const legal = state.legalActions;
      state = (
        await agent.post('/api/local-games/current/actions').send({
          seatNumber: legal.seatNumber,
          type: 'all-in'
        })
      ).body;
    }

    expect(state.bettingRound).toBe('complete');
    expect(state.communityCards).toHaveLength(5);
    expect(state.pots.length).toBeGreaterThanOrEqual(1);
    expect(state.result).not.toBeNull();
  });
});
