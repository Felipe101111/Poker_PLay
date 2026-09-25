import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildTestApp } from '../helpers/testApp.js';

const app = buildTestApp();

describe('Malformed JSON body handling', () => {
  it('returns 400 VALIDATION_ERROR instead of a 500 for unparseable JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{not valid json');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
