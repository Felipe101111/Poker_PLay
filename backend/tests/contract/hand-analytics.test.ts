import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/testApp.js';

describe('hand analytics contract', () => {
  it('requires authentication', async () => {
    const response = await request(buildTestApp()).get('/api/hand-history/analytics');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects invalid analytics filters before querying histories', async () => {
    const response = await request(buildTestApp()).get('/api/hand-history/analytics?relatedLimit=51');
    expect(response.status).toBe(401);
  });
});
