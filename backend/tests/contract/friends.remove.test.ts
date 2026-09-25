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

describe('DELETE /api/friends/:userId (remove)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('removes an existing friendship for both sides (204)', async () => {
    const a = await registerAndLogin('a@example.com', 'AliceRemove');
    const b = await registerAndLogin('b@example.com', 'BobRemove');
    const sent = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });
    await b.agent.post(`/api/friends/requests/${sent.body.id}/accept`);

    const res = await a.agent.delete(`/api/friends/${b.id}`);

    expect(res.status).toBe(204);
    expect(await a.agent.get('/api/friends').then((r) => r.body)).toEqual([]);
    expect(await b.agent.get('/api/friends').then((r) => r.body)).toEqual([]);
  });

  it('is idempotent when the target is not currently a friend (204)', async () => {
    const a = await registerAndLogin('a2@example.com', 'AliceRemove2');
    const b = await registerAndLogin('b2@example.com', 'BobRemove2');

    const res = await a.agent.delete(`/api/friends/${b.id}`);
    expect(res.status).toBe(204);
  });
});
