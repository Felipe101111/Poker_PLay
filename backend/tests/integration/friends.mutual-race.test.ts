import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';
import { prisma } from '../../src/db/prisma/client.js';

const app = buildTestApp();

async function registerAndLogin(email: string, username: string) {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ email, username, password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return { agent, id: registerRes.body.id as string };
}

describe('Mutual friend request race (FR-006)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('resolves A->B then B->A into a single ACCEPTED row, not a conflict', async () => {
    const a = await registerAndLogin('race-a@example.com', 'RaceA');
    const b = await registerAndLogin('race-b@example.com', 'RaceB');

    await a.agent.post('/api/friends/requests').send({ receiverId: b.id });
    const reverse = await b.agent.post('/api/friends/requests').send({ receiverId: a.id });

    expect(reverse.status).toBe(200);
    expect(reverse.body.status).toBe('ACCEPTED');

    const rows = await prisma.friendRequest.findMany({
      where: {
        OR: [
          { senderId: a.id, receiverId: b.id },
          { senderId: b.id, receiverId: a.id }
        ]
      }
    });

    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('ACCEPTED');
  });
});
