import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

describe('POST /api/auth/register', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('creates a new account and never returns the password/hash (201)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'trainer1@example.com',
      username: 'Trainer1',
      password: 'correcthorse'
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      email: 'trainer1@example.com',
      username: 'Trainer1'
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.password).toBeUndefined();
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('rejects a password shorter than 8 characters (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'short@example.com',
      username: 'ShortPw',
      password: 'abc123'
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a duplicate email (409 ACCOUNT_EXISTS)', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'dup@example.com',
      username: 'FirstUser',
      password: 'correcthorse'
    });

    const res = await request(app).post('/api/auth/register').send({
      email: 'dup@example.com',
      username: 'SecondUser',
      password: 'correcthorse'
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACCOUNT_EXISTS');
  });

  it('rejects a duplicate (normalized) username (409 ACCOUNT_EXISTS)', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'user-a@example.com',
      username: 'SameName',
      password: 'correcthorse'
    });

    const res = await request(app).post('/api/auth/register').send({
      email: 'user-b@example.com',
      username: '  samename  ',
      password: 'correcthorse'
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ACCOUNT_EXISTS');
  });
});
