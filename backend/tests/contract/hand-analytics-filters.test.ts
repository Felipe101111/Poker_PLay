import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/testApp.js';

describe('hand analytics filters contract', () => {
  it('keeps analytics protected while accepting only authenticated requests', async () => {
    const response = await request(buildTestApp()).get('/api/hand-history/analytics?from=bad&to=bad&format=CASH');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});
