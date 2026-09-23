import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import argon2 from 'argon2';
import { prisma } from '../../src/db/prisma/client.js';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

describe('Registration integration: secure password hashing', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('stores an Argon2id hash that never equals the submitted plaintext password (SC-003)', async () => {
    const plaintext = 'correcthorsebattery';

    await request(app).post('/api/auth/register').send({
      email: 'hash-check@example.com',
      username: 'HashCheck',
      password: plaintext
    });

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: 'hash-check@example.com' }
    });

    expect(stored.passwordHash).not.toBe(plaintext);
    expect(stored.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(await argon2.verify(stored.passwordHash, plaintext)).toBe(true);
  });
});
