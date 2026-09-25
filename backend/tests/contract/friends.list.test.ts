import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

async function registerAndLogin(email: string, username: string) {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return { agent, id: registerRes.body.id as string };
}

describe('GET /api/friends', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('lists accepted friends with an online flag and never leaks email (200)', async () => {
    const a = await registerAndLogin('a@example.com', 'AliceList2');
    const b = await registerAndLogin('b@example.com', 'BobList2');
    const sent = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });
    await b.agent.post(`/api/friends/requests/${sent.body.id}/accept`);

    const res = await a.agent.get('/api/friends');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].username).toBe('BobList2');
    expect(res.body[0].online).toBe(true);
    expect(res.body[0].email).toBeUndefined();
  });

  it('returns an empty list, not an error, when the user has no friends', async () => {
    const a = await registerAndLogin('lonely@example.com', 'LonelyUser');

    const res = await a.agent.get('/api/friends');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
