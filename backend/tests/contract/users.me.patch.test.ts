import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

async function registerAndLogin(email: string, username: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ email, username, password: 'correcthorse' });
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('PATCH /api/users/me', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('updates the username and returns it (200)', async () => {
    const agent = await registerAndLogin('patch-user@example.com', 'OldName');

    const res = await agent.patch('/api/users/me').send({ username: 'NewName' });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('NewName');
  });

  it('ignores id/email/createdAt in the request body (FR-011)', async () => {
    const agent = await registerAndLogin('immutable-user@example.com', 'ImmutableUser');
    const before = await agent.get('/api/users/me');

    const res = await agent.patch('/api/users/me').send({
      id: 'attacker-supplied-id',
      email: 'hijacked@example.com',
      createdAt: '2000-01-01T00:00:00.000Z',
      username: 'StillMe'
    });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(before.body.id);
    expect(res.body.email).toBe('immutable-user@example.com');
    expect(res.body.createdAt).toBe(before.body.createdAt);
    expect(res.body.username).toBe('StillMe');
  });

  it('rejects an empty username (400)', async () => {
    const agent = await registerAndLogin('empty-username@example.com', 'HasName');

    const res = await agent.patch('/api/users/me').send({ username: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a username already taken by another account (409)', async () => {
    await registerAndLogin('first@example.com', 'TakenName');
    const agent = await registerAndLogin('second@example.com', 'OtherName');

    const res = await agent.patch('/api/users/me').send({ username: 'TakenName' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('rejects an unauthenticated request (401)', async () => {
    const res = await request(app).patch('/api/users/me').send({ username: 'Nobody' });
    expect(res.status).toBe(401);
  });
});
