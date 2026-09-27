import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';
import { registerAndLoginLocalGame } from '../helpers/localGames.js';

const app = buildTestApp();

describe('POST /api/local-games/current/actions', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('applies a legal action and returns the next state', async () => {
    const agent = await registerAndLoginLocalGame('actions@example.com', 'PokerActions');
    const start = await agent.post('/api/local-games').send({ seatCount: 3 });
    const legal = start.body.legalActions;

    const response = await agent.post('/api/local-games/current/actions').send({
      seatNumber: legal.seatNumber,
      type: legal.actions.includes('call') ? 'call' : 'fold'
    });

    expect(response.status).toBe(200);
    expect(response.body.actionHistory).toBeUndefined();
    expect(response.body.seatToAct).not.toBe(legal.seatNumber);
  });

  it('rejects an illegal action without changing the hand', async () => {
    const agent = await registerAndLoginLocalGame('illegal@example.com', 'PokerIllegal');
    const start = await agent.post('/api/local-games').send({ seatCount: 3 });
    const legal = start.body.legalActions;
    const before = await agent.get('/api/local-games/current?asSeat=1');

    const response = await agent.post('/api/local-games/current/actions').send({
      seatNumber: legal.seatNumber,
      type: 'check'
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('ILLEGAL_ACTION');

    const after = await agent.get('/api/local-games/current?asSeat=1');
    expect(after.body.seatToAct).toBe(before.body.seatToAct);
    expect(after.body.communityCards).toEqual(before.body.communityCards);
    expect(after.body.pots).toEqual(before.body.pots);
  });

  it('returns 404 when no active hand exists', async () => {
    const agent = await registerAndLoginLocalGame('missing-action@example.com', 'PokerMissingAction');

    const response = await agent.post('/api/local-games/current/actions').send({
      seatNumber: 1,
      type: 'fold'
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('HAND_NOT_FOUND');
  });
});
