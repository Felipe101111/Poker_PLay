import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

describe('POST /api/auth/logout', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('terminates the session (204)', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      email: 'logout-user@example.com',
      username: 'LogoutUser',
      password: 'correcthorse'
    });
    await agent
      .post('/api/auth/login')
      .send({ email: 'logout-user@example.com', password: 'correcthorse' });

    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(204);
  });

  it('is idempotent when called again / without a session (204)', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(204);
  });
});
