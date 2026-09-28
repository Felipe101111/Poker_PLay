import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();
async function loggedIn(label: string) {
  const suffix = `${label}${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `${suffix}@example.com`;
  await request(app).post('/api/auth/register').send({ email, username: suffix.slice(0, 20), password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('trainer progress integration', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('aggregates multiple decisions without exposing another user', async () => {
    const first = await loggedIn('first');
    const second = await loggedIn('second');
    const started = await first.post('/api/trainer/session/start').send({});
    await first.post('/api/trainer/session/decisions').send({ scenarioId: started.body.scenario.id, requestId: 'progress-one', action: { type: 'fold' } });
    const firstProgress = await first.get('/api/trainer/progress');
    const secondProgress = await second.get('/api/trainer/progress');
    expect(firstProgress.body.progress).toMatchObject({ completedDecisions: 1, empty: false });
    expect(secondProgress.body.progress).toMatchObject({ completedDecisions: 0, unavailable: 0, empty: true });
  });
});
