import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

async function registerUser(email: string, username: string) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: 'correcthorse' });
  return res.body as { id: string; username: string };
}

async function loginAs(email: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('GET /api/friends/search', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('finds a matching username and excludes the caller (200)', async () => {
    await registerUser('a@example.com', 'AliceSearch');
    await registerUser('b@example.com', 'BobSearch');
    const agent = await loginAs('a@example.com');

    const res = await agent.get('/api/friends/search?query=Search');

    expect(res.status).toBe(200);
    const usernames = res.body.map((u: { username: string }) => u.username);
    expect(usernames).toContain('BobSearch');
    expect(usernames).not.toContain('AliceSearch');
  });

  it('rejects an empty query (400)', async () => {
    await registerUser('c@example.com', 'CarlSearch');
    const agent = await loginAs('c@example.com');

    const res = await agent.get('/api/friends/search?query=');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unauthenticated request (401)', async () => {
    const res = await request(app).get('/api/friends/search?query=anything');
    expect(res.status).toBe(401);
  });
});
