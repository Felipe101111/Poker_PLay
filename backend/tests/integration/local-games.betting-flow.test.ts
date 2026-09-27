import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';
import { registerAndLoginLocalGame } from '../helpers/localGames.js';

const app = buildTestApp();

describe('local game betting flow', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('plays a complete hand through the HTTP API', async () => {
    const agent = await registerAndLoginLocalGame('flow@example.com', 'PokerFlow');
    await agent.post('/api/local-games').send({ seatCount: 3 });

    let state = (await agent.get('/api/local-games/current?asSeat=1')).body;
    const rounds: string[] = [];

    for (let attempt = 0; attempt < 100 && state.bettingRound !== 'complete'; attempt++) {
      rounds.push(state.bettingRound);
      const legal = state.legalActions;
      expect(legal).not.toBeNull();
      const type = legal.actions.includes('check') ? 'check' : 'call';
      state = (
        await agent.post('/api/local-games/current/actions').send({
          seatNumber: legal.seatNumber,
          type
        })
      ).body;
    }

    expect(state.bettingRound).toBe('complete');
    expect(state.communityCards).toHaveLength(5);
    expect(state.result).not.toBeNull();
    expect(rounds).toEqual(expect.arrayContaining(['preflop', 'flop', 'turn', 'river']));
  });
});
