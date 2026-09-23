import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

async function registerUser() {
  await request(app).post('/api/auth/register').send({
    email: 'login-user@example.com',
    username: 'LoginUser',
    password: 'correcthorse'
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await resetDatabase();
    await registerUser();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('logs in with correct credentials and sets a session cookie (200)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login-user@example.com', password: 'correcthorse' });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('login-user@example.com');
    expect(res.headers['set-cookie']?.[0]).toMatch(/sid=/);
  });

  it('returns the identical error body for a wrong password and an unknown email (SC-004)', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login-user@example.com', password: 'wrong-password' });

    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'no-such-user@example.com', password: 'whatever1' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
