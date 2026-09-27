import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';
import { registerAndLoginLocalGame } from '../helpers/localGames.js';

const app = buildTestApp();

describe('local game showdown', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('returns the completed result and reveals non-folded hole cards', async () => {
    const agent = await registerAndLoginLocalGame('showdown@example.com', 'PokerShowdown');
    await agent.post('/api/local-games').send({ seatCount: 2 });

    let state = (await agent.get('/api/local-games/current?asSeat=1')).body;
    for (let attempt = 0; attempt < 100 && state.bettingRound !== 'complete'; attempt++) {
      const legal = state.legalActions;
      const type = legal.actions.includes('check') ? 'check' : 'call';
      state = (
        await agent.post('/api/local-games/current/actions').send({
          seatNumber: legal.seatNumber,
          type
        })
      ).body;
    }

    expect(state.bettingRound).toBe('complete');
    expect(state.result.potsAwarded).toHaveLength(1);
    expect(state.result.revealedSeats).toEqual([1, 2]);
    expect(state.seats.every((seat: { holeCards: unknown }) => seat.holeCards !== null)).toBe(true);
    expect(state.pots[0].winners).toEqual(expect.any(Array));
  });
});
