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

describe('DELETE /api/local-games/current (abandon)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('abandons the active hand (204) and frees the user to start a new one', async () => {
    const agent = await registerAndLogin('a@example.com', 'PokerAbandon');
    await agent.post('/api/local-games').send({ seatCount: 3 });

    const abandonRes = await agent.delete('/api/local-games/current');
    expect(abandonRes.status).toBe(204);

    const restartRes = await agent.post('/api/local-games').send({ seatCount: 3 });
    expect(restartRes.status).toBe(201);
  });

  it('is idempotent when there is no active hand (204)', async () => {
    const agent = await registerAndLogin('b@example.com', 'PokerAbandon2');

    const res = await agent.delete('/api/local-games/current');
    expect(res.status).toBe(204);
  });
});
