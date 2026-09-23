import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/db/prisma/client.js';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

describe('Login integration: session creation and expiry', () => {
  beforeEach(async () => {
    await resetDatabase();
    await request(app).post('/api/auth/register').send({
      email: 'session-user@example.com',
      username: 'SessionUser',
      password: 'correcthorse'
    });
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('creates a session row with expiresAt ~7 days from now (FR-008)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'session-user@example.com', password: 'correcthorse' });

    expect(res.status).toBe(200);

    // Compute the delta entirely inside Postgres (expire - now()) so the result
    // is independent of the server's timezone setting and the test process's clock.
    const rows = await prisma.$queryRawUnsafe<{ seconds_until_expiry: number }[]>(
      `SELECT EXTRACT(EPOCH FROM (expire - now())) AS seconds_until_expiry FROM "session" ORDER BY expire DESC LIMIT 1`
    );

    expect(rows.length).toBe(1);
    const secondsUntilExpiry = Number(rows[0].seconds_until_expiry);
    const sevenDaysSeconds = 7 * 24 * 60 * 60;

    expect(secondsUntilExpiry).toBeGreaterThan(sevenDaysSeconds - 60);
    expect(secondsUntilExpiry).toBeLessThan(sevenDaysSeconds + 60);
  });
});
