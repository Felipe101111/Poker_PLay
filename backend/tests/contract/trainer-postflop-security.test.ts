import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';

describe('postflop security contract', () => {
  const app = buildTestApp();
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('rejects derived client fields and foreign scenarios without leakage', async () => {
    await request(app).post('/api/auth/register').send({ email: 'owner@example.com', username: 'Owner', password: 'correcthorse' });
    const owner = request.agent(app);
    await owner.post('/api/auth/login').send({ email: 'owner@example.com', password: 'correcthorse' });
    const started = await owner.post('/api/trainer/postflop/session/start').send({});
    expect(started.body.scenario).not.toHaveProperty('deck');
    expect(started.body.scenario).not.toHaveProperty('opponentHoleCards');
    const forged = await owner.post('/api/trainer/postflop/session/decisions').send({ scenarioId: started.body.scenario.id, requestId: 'forged', board: [], strategyVersion: 'evil', action: { type: 'check' } });
    expect(forged.status).toBe(400);
    await request(app).post('/api/auth/register').send({ email: 'other@example.com', username: 'Other', password: 'correcthorse' });
    const other = request.agent(app);
    await other.post('/api/auth/login').send({ email: 'other@example.com', password: 'correcthorse' });
    const foreign = await other.post('/api/trainer/postflop/session/decisions').send({ scenarioId: started.body.scenario.id, requestId: 'foreign', action: { type: 'check' } });
    expect(foreign.status).toBe(404);
  });
});
