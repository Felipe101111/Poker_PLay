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

describe('POST /api/friends/requests', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('creates a new PENDING request (201)', async () => {
    const a = await registerAndLogin('a@example.com', 'AliceReq');
    const b = await registerAndLogin('b@example.com', 'BobReq');

    const res = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
  });

  it('rejects a self-request (400)', async () => {
    const a = await registerAndLogin('self@example.com', 'SelfReq');

    const res = await a.agent.post('/api/friends/requests').send({ receiverId: a.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an unknown receiverId (404)', async () => {
    const a = await registerAndLogin('a2@example.com', 'AliceReq2');

    const res = await a.agent
      .post('/api/friends/requests')
      .send({ receiverId: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('rejects a duplicate pending request (409)', async () => {
    const a = await registerAndLogin('a3@example.com', 'AliceReq3');
    const b = await registerAndLogin('b3@example.com', 'BobReq3');

    await a.agent.post('/api/friends/requests').send({ receiverId: b.id });
    const res = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('FRIEND_REQUEST_CONFLICT');
  });

  it('rejects a request between users who are already friends (409)', async () => {
    const a = await registerAndLogin('a4@example.com', 'AliceReq4');
    const b = await registerAndLogin('b4@example.com', 'BobReq4');

    const sent = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });
    await b.agent.post(`/api/friends/requests/${sent.body.id}/accept`);

    const res = await a.agent.post('/api/friends/requests').send({ receiverId: b.id });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('FRIEND_REQUEST_CONFLICT');
  });
});
