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

describe('DELETE /api/friends/requests/:id (cancel)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('lets the sender cancel a pending request (204)', async () => {
    const a = await registerAndLogin('a@example.com', 'AliceCancel');
    const b = await registerAndLogin('b@example.com', 'BobCancel');
    const sent = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });

    const res = await a.agent.delete(`/api/friends/requests/${sent.body.id}`);

    expect(res.status).toBe(204);
    const bView = await b.agent.get('/api/friends/requests');
    expect(bView.body.incoming).toHaveLength(0);
  });

  it('rejects cancellation attempts from anyone but the sender (403)', async () => {
    const a = await registerAndLogin('a2@example.com', 'AliceCancel2');
    const b = await registerAndLogin('b2@example.com', 'BobCancel2');
    const sent = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });

    const res = await b.agent.delete(`/api/friends/requests/${sent.body.id}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 for a non-pending/non-existent request', async () => {
    const a = await registerAndLogin('a3@example.com', 'AliceCancel3');
    const res = await a.agent.delete('/api/friends/requests/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
