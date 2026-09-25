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

describe('Friend online/offline status (FR-013)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('shows online while logged in and offline after logout', async () => {
    const a = await registerAndLogin('a@example.com', 'AliceOnline');
    const b = await registerAndLogin('b@example.com', 'BobOnline');
    const sent = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });
    await b.agent.post(`/api/friends/requests/${sent.body.id}/accept`);

    const whileOnline = await a.agent.get('/api/friends');
    expect(whileOnline.body[0].online).toBe(true);

    await b.agent.post('/api/auth/logout');

    const afterLogout = await a.agent.get('/api/friends');
    expect(afterLogout.body[0].online).toBe(false);
  });
});
