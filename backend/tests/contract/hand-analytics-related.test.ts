import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/testApp.js';

describe('hand analytics related hands contract', () => {
  it('does not allow related-hand enumeration without authentication', async () => {
    const response = await request(buildTestApp()).get('/api/hand-history/analytics?relatedLimit=50');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});
