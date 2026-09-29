import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/testApp.js';

describe('hand history filters contract', () => {
  it('rejects invalid queries after authentication is required', async () => {
    const response = await request(buildTestApp()).get('/api/hand-history?pageSize=101&direction=random');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});