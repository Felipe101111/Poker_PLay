import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

describe('GET /api/users/me', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('rejects an unauthenticated request (401)', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns the profile for an authenticated user (200)', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send({
      email: 'profile-user@example.com',
      username: 'ProfileUser',
      password: 'correcthorse'
    });
    await agent
      .post('/api/auth/login')
      .send({ email: 'profile-user@example.com', password: 'correcthorse' });

    const res = await agent.get('/api/users/me');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email: 'profile-user@example.com',
      username: 'ProfileUser'
    });
  });
});
