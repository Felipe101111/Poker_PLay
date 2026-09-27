import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();
async function loggedIn() {
  const email = `progress-${Date.now()}@example.com`;
  await request(app).post('/api/auth/register').send({ email, username: `Progress${Date.now()}`, password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('trainer progress contract', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('returns an explicit empty state and user-scoped counts', async () => {
    const agent = await loggedIn();
    const empty = await agent.get('/api/trainer/progress');
    expect(empty.status).toBe(200);
    expect(empty.body.progress).toMatchObject({ completedDecisions: 0, unavailable: 0, empty: true });
    const started = await agent.post('/api/trainer/session/start').send({});
    await agent.post('/api/trainer/session/decisions').send({ scenarioId: started.body.scenario.id, requestId: 'progress-decision', action: { type: 'fold' } });
    const populated = await agent.get('/api/trainer/progress');
    expect(populated.body.progress).toMatchObject({ completedDecisions: 1, unavailable: 1, empty: false });
    expect(populated.body.progress.byAction.fold).toBe(1);
  });
});
