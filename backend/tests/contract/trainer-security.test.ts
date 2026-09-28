import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

async function loggedIn(prefix: string) {
  const suffix = `${prefix}-${Date.now()}-${Math.random()}`;
  const email = `${suffix}@example.com`;
  await request(app).post('/api/auth/register').send({ email, username: suffix.slice(0, 20), password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('trainer security contract', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('rejects foreign scenarios and never exposes internal snapshots', async () => {
    const owner = await loggedIn('owner');
    const foreign = await loggedIn('foreign');
    const started = await owner.post('/api/trainer/session/start').send({ userId: 'forged-user-id' });
    const response = await foreign.post('/api/trainer/session/decisions').send({ scenarioId: started.body.scenario.id, requestId: 'foreign-1', action: { type: 'fold' } });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('TRAINING_ACCESS_DENIED');
    expect(started.body.scenario).not.toHaveProperty('engineSnapshot');
    expect(started.body.scenario).not.toHaveProperty('deck');
  });

  it('keeps progress scoped and rejects malformed decisions', async () => {
    const owner = await loggedIn('progress-owner');
    const other = await loggedIn('progress-other');
    const started = await owner.post('/api/trainer/session/start').send({});
    const malformed = await owner.post('/api/trainer/session/decisions').send({ scenarioId: started.body.scenario.id, requestId: '', action: { type: 'fold' } });
    expect(malformed.status).toBe(400);
    await owner.post('/api/trainer/session/decisions').send({ scenarioId: started.body.scenario.id, requestId: 'scope-1', action: { type: 'fold' } });
    expect((await other.get('/api/trainer/progress')).body.progress.completedDecisions).toBe(0);
  });
});