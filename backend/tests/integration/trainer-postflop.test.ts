import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';

describe('postflop integration', () => {
  const app = buildTestApp();
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('keeps one active postflop session per user and persists ordered scenarios', async () => {
    await request(app).post('/api/auth/register').send({ email: 'integration@example.com', username: 'Integration', password: 'correcthorse' });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'integration@example.com', password: 'correcthorse' });
    const first = await agent.post('/api/trainer/postflop/session/start').send({});
    const resumed = await agent.post('/api/trainer/postflop/session/start').send({});
    expect(resumed.body.session.id).toBe(first.body.session.id);
    const scenario = first.body.scenario;
    const type = scenario.legalActions.actions.includes('check') ? 'check' : 'call';
    const decision = await agent.post('/api/trainer/postflop/session/decisions').send({ scenarioId: scenario.id, requestId: 'integration-1', action: { type } });
    const next = await agent.post('/api/trainer/postflop/session/next').send({ decisionId: decision.body.decision.id, requestId: 'integration-next' });
    expect(next.body.scenario.sequence).toBe(2);
    expect(next.body.scenario.board).toHaveLength(4);
    expect(next.body.scenario.id).not.toBe(scenario.id);
  });
});
