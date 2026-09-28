import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';

describe('postflop history contract', () => {
  const app = buildTestApp();
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('resumes ordered postflop decisions', async () => {
    await request(app).post('/api/auth/register').send({ email: 'history@example.com', username: 'History', password: 'correcthorse' });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'history@example.com', password: 'correcthorse' });
    const start = await agent.post('/api/trainer/postflop/session/start').send({});
    const type = start.body.scenario.legalActions.actions.includes('check') ? 'check' : 'call';
    const decision = await agent.post('/api/trainer/postflop/session/decisions').send({ scenarioId: start.body.scenario.id, requestId: 'history-decision', action: { type } });
    await agent.post('/api/trainer/postflop/session/next').send({ decisionId: decision.body.decision.id, requestId: 'history-next' });
    const resumed = await agent.get('/api/trainer/postflop/session');
    expect(resumed.body.history).toHaveLength(1);
    expect(resumed.body.history[0].scenarioId).toBe(start.body.scenario.id);
    expect(resumed.body.scenario.sequence).toBe(2);
  });
});
