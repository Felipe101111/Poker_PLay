import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

describe('Logout integration: session invalidation (SC-006)', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('rejects requests with the old cookie after logout', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      email: 'post-logout@example.com',
      username: 'PostLogout',
      password: 'correcthorse'
    });
    await agent
      .post('/api/auth/login')
      .send({ email: 'post-logout@example.com', password: 'correcthorse' });

    await agent.post('/api/auth/logout');

    const res = await agent.get('/api/users/me');
    expect(res.status).toBe(401);
  });
});
