import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

async function loggedIn() {
  const email = `session-race-${Date.now()}@example.com`;
  await request(app).post('/api/auth/register').send({ email, username: `Race${Date.now()}`, password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('trainer session concurrency', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('keeps one active session when starts race', async () => {
    const agent = await loggedIn();
    const responses = await Promise.all([
      agent.post('/api/trainer/session/start').send({}),
      agent.post('/api/trainer/session/start').send({})
    ]);
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(new Set(responses.map((response) => response.body.session.id)).size).toBe(1);
    const current = await agent.get('/api/trainer/session');
    expect(current.body.scenario.holeCards).toHaveLength(2);
    expect(new Set(current.body.scenario.holeCards.map((card: { rank: string; suit: string }) => `${card.rank}${card.suit}`)).size).toBe(2);
  });
});
