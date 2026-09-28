import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

async function loggedIn() {
  const email = `decision-race-${Date.now()}@example.com`;
  await request(app).post('/api/auth/register').send({ email, username: `DecisionRace${Date.now()}`, password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('trainer decision concurrency', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('persists at most one decision for concurrent submissions', async () => {
    const agent = await loggedIn();
    const started = await agent.post('/api/trainer/session/start').send({});
    const payload = { scenarioId: started.body.scenario.id, requestId: 'concurrent-1', action: { type: 'fold' } };
    const responses = await Promise.all([
      agent.post('/api/trainer/session/decisions').send(payload),
      agent.post('/api/trainer/session/decisions').send(payload)
    ]);
    expect(responses.every((response) => [200, 201].includes(response.status))).toBe(true);
    expect(new Set(responses.map((response) => response.body.decision.id)).size).toBe(1);
    expect((await agent.get('/api/trainer/progress')).body.progress.completedDecisions).toBe(1);
  });
});
