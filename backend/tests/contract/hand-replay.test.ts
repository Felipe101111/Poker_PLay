import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/testApp.js';

describe('hand replay contract', () => {
  it('requires authentication', async () => {
    const response = await request(buildTestApp()).get('/api/hand-history/history-1/replay');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});
