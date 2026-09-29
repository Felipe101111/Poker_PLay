import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/testApp.js';

describe('hand history privacy contract', () => {
  it('requires authentication for privacy requests', async () => {
    const response = await request(buildTestApp()).delete('/api/hand-history/unknown');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});