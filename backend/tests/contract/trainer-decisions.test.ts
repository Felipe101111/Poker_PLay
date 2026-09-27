import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();
async function loggedIn() {
  const email = `decision-${Date.now()}@example.com`;
  await request(app).post('/api/auth/register').send({ email, username: `Decision${Date.now()}`, password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('trainer decision contract', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('persists one legal action and returns the same result on retry', async () => {
    const agent = await loggedIn();
    const session = await agent.post('/api/trainer/session/start').send({});
    const scenario = session.body.scenario;
    const first = await agent.post('/api/trainer/session/decisions').send({ scenarioId: scenario.id, requestId: 'retry-1', action: { type: 'fold' } });
    const retry = await agent.post('/api/trainer/session/decisions').send({ scenarioId: scenario.id, requestId: 'retry-1', action: { type: 'fold' } });

    expect(first.status).toBe(201);
    expect(first.body.decision.scenarioId).toBe(scenario.id);
    expect(first.body.decision).not.toHaveProperty('explanationSnapshot');
    expect(retry.status).toBe(200);
    expect(retry.body.decision.id).toBe(first.body.decision.id);
  });

  it('rejects an action that is not legal without creating a result', async () => {
    const agent = await loggedIn();
    const session = await agent.post('/api/trainer/session/start').send({});
    const response = await agent.post('/api/trainer/session/decisions').send({ scenarioId: session.body.scenario.id, requestId: 'illegal-1', action: { type: 'check' } });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ILLEGAL_TRAINING_ACTION');
  });
});
