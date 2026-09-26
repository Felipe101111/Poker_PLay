import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

async function registerAndLogin(email: string, username: string) {
  await request(app).post('/api/auth/register').send({ email, username, password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('POST /api/local-games', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('starts a new hand (201)', async () => {
    const agent = await registerAndLogin('a@example.com', 'PokerA');

    const res = await agent.post('/api/local-games').send({ seatCount: 4, startingStackBB: 100 });

    expect(res.status).toBe(201);
    expect(res.body.bettingRound).toBe('preflop');
    expect(res.body.seats).toHaveLength(4);
  });

  it('rejects a seatCount outside 2-9 (400)', async () => {
    const agent = await registerAndLogin('b@example.com', 'PokerB');

    const res = await agent.post('/api/local-games').send({ seatCount: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects starting a second hand while one is active (409)', async () => {
    const agent = await registerAndLogin('c@example.com', 'PokerC');
    await agent.post('/api/local-games').send({ seatCount: 3 });

    const res = await agent.post('/api/local-games').send({ seatCount: 3 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('HAND_IN_PROGRESS');
  });
});
