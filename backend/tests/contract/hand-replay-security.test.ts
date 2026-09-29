import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/testApp.js';

describe('hand replay security contract', () => {
  it('does not enumerate replay IDs without a session', async () => {
    const response = await request(buildTestApp()).get('/api/hand-history/foreign/replay');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});
