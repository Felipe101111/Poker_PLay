import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();
async function loggedIn() {
  const suffix = `cont${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `${suffix}@example.com`;
  await request(app).post('/api/auth/register').send({ email, username: suffix.slice(0, 20), password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('trainer continuation lifecycle', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('keeps the previous decision immutable and retries continuation safely', async () => {
    const agent = await loggedIn();
    const started = await agent.post('/api/trainer/session/start').send({});
    const decision = await agent.post('/api/trainer/session/decisions').send({ scenarioId: started.body.scenario.id, requestId: 'lifecycle-decision', action: { type: 'fold' } });
    const next = await agent.post('/api/trainer/session/next').send({ decisionId: decision.body.decision.id, requestId: 'lifecycle-next' });
    expect(next.status).toBe(201);
    expect(next.body.decision.id).toBe(decision.body.decision.id);
    expect(next.body.scenario.sequence).toBe(2);
    const retry = await agent.post('/api/trainer/session/next').send({ decisionId: decision.body.decision.id, requestId: 'lifecycle-next' });
    expect(retry.status).toBe(409);
    const resumed = await agent.get('/api/trainer/session');
    expect(resumed.body.latestDecision.id).toBe(decision.body.decision.id);
    expect(resumed.body.scenario.id).toBe(next.body.scenario.id);
  });
});
