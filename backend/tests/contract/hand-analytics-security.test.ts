import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/testApp.js';

describe('hand analytics security contract', () => {
  it('uses the standard unauthenticated envelope', async () => {
    const response = await request(buildTestApp()).get('/api/hand-history/analytics');
    expect(response.status).toBe(401);
    expect(Object.keys(response.body)).toEqual(['error']);
  });
});
