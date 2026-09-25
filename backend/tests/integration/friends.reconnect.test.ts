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

describe('Reconnection after removal/cancellation (FR-009)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('allows a brand-new request after a friendship is removed', async () => {
    const a = await registerAndLogin('a@example.com', 'AliceReconnect');
    const b = await registerAndLogin('b@example.com', 'BobReconnect');
    const sent = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });
    await b.agent.post(`/api/friends/requests/${sent.body.id}/accept`);

    await a.agent.delete(`/api/friends/${b.id}`);

    const resend = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });
    expect(resend.status).toBe(201);
    expect(resend.body.status).toBe('PENDING');
    expect(resend.body.id).not.toBe(sent.body.id);
  });

  it('allows a brand-new request after a pending one is cancelled', async () => {
    const a = await registerAndLogin('a2@example.com', 'AliceReconnect2');
    const b = await registerAndLogin('b2@example.com', 'BobReconnect2');
    const sent = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });

    await a.agent.delete(`/api/friends/requests/${sent.body.id}`);

    const resend = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });
    expect(resend.status).toBe(201);
    expect(resend.body.id).not.toBe(sent.body.id);
  });
});
