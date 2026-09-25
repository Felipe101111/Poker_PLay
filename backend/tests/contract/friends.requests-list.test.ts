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

describe('GET /api/friends/requests', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('splits requests into incoming and outgoing correctly', async () => {
    const a = await registerAndLogin('a@example.com', 'AliceList');
    const b = await registerAndLogin('b@example.com', 'BobList');

    await a.agent.post('/api/friends/requests').send({ receiverId: b.id });

    const aView = await a.agent.get('/api/friends/requests');
    const bView = await b.agent.get('/api/friends/requests');

    expect(aView.body.outgoing).toHaveLength(1);
    expect(aView.body.outgoing[0].receiverUsername).toBe('BobList');
    expect(aView.body.incoming).toHaveLength(0);

    expect(bView.body.incoming).toHaveLength(1);
    expect(bView.body.incoming[0].senderUsername).toBe('AliceList');
    expect(bView.body.outgoing).toHaveLength(0);
  });
});
