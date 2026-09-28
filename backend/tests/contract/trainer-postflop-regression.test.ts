import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';

describe('preflop regression boundary', () => {
  const app = buildTestApp();
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('keeps the original preflop session endpoint and redaction intact', async () => {
    await request(app).post('/api/auth/register').send({ email: 'legacy@example.com', username: 'Legacy', password: 'correcthorse' });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'legacy@example.com', password: 'correcthorse' });
    const response = await agent.post('/api/trainer/session/start').send({});
    expect(response.status).toBe(200);
    expect(response.body.session.format).toBe('SIX_MAX_100BB_PREFLOP');
    expect(response.body.scenario).not.toHaveProperty('deck');
  });
});
