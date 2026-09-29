import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/testApp.js';

describe('hand analytics metrics contract', () => {
  it('does not expose metrics without an authenticated session', async () => {
    const response = await request(buildTestApp()).get('/api/hand-history/analytics');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});
