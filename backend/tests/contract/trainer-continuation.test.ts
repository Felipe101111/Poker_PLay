import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();
async function loggedIn() {
  const email = `next-${Date.now()}@example.com`;
  await request(app).post('/api/auth/register').send({ email, username: `Next${Date.now()}`, password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('trainer continuation contract', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('returns the completed result and a fresh scenario', async () => {
    const agent = await loggedIn();
    const started = await agent.post('/api/trainer/session/start').send({});
    const decision = await agent.post('/api/trainer/session/decisions').send({ scenarioId: started.body.scenario.id, requestId: 'next-decision', action: { type: 'fold' } });
    const next = await agent.post('/api/trainer/session/next').send({ decisionId: decision.body.decision.id, requestId: 'next-request' });

    expect(next.status).toBe(201);
    expect(next.body.decision.id).toBe(decision.body.decision.id);
    expect(next.body.scenario.id).not.toBe(started.body.scenario.id);
  });
});
