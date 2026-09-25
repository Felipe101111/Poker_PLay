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

describe('Respond to a friend request', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('lets the receiver accept a request (200)', async () => {
    const a = await registerAndLogin('a@example.com', 'AliceResp');
    const b = await registerAndLogin('b@example.com', 'BobResp');
    const sent = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });

    const res = await b.agent.post(`/api/friends/requests/${sent.body.id}/accept`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACCEPTED');
  });

  it('lets the receiver reject a request (200), and it no longer blocks a resend', async () => {
    const a = await registerAndLogin('a2@example.com', 'AliceResp2');
    const b = await registerAndLogin('b2@example.com', 'BobResp2');
    const sent = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });

    const rejectRes = await b.agent.post(`/api/friends/requests/${sent.body.id}/reject`);
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe('REJECTED');

    const resend = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });
    expect(resend.status).toBe(201);
    expect(resend.body.status).toBe('PENDING');
  });

  it('rejects accept/reject attempts from the sender or a third party (403)', async () => {
    const a = await registerAndLogin('a3@example.com', 'AliceResp3');
    const b = await registerAndLogin('b3@example.com', 'BobResp3');
    const sent = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });

    const bySender = await a.agent.post(`/api/friends/requests/${sent.body.id}/accept`);
    expect(bySender.status).toBe(403);
  });

  it('returns 404 for a non-existent or already-resolved request', async () => {
    const a = await registerAndLogin('a4@example.com', 'AliceResp4');

    const res = await a.agent.post('/api/friends/requests/00000000-0000-0000-0000-000000000000/accept');
    expect(res.status).toBe(404);
  });
});
