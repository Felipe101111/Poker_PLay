import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/testApp.js';

describe('hand history contract', () => {
  it('requires authentication for list, detail, and privacy operations', async () => {
    const app = buildTestApp();
    for (const response of await Promise.all([
      request(app).get('/api/hand-history'),
      request(app).get('/api/hand-history/unknown'),
      request(app).delete('/api/hand-history/unknown')
    ])) {
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    }
  });
});