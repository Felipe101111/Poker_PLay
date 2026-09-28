import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';

describe('postflop HTTP contract', () => {
  const app = buildTestApp();

  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('requires authentication and starts/resumes a redacted flop scenario', async () => {
    const unauthenticated = await request(app).post('/api/trainer/postflop/session/start').send({});
    expect(unauthenticated.status).toBe(401);
    await request(app).post('/api/auth/register').send({ email: 'postflop@example.com', username: 'Postflop', password: 'correcthorse' });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'postflop@example.com', password: 'correcthorse' });
    const first = await agent.post('/api/trainer/postflop/session/start').send({});
    const second = await agent.get('/api/trainer/postflop/session');
    expect(first.status).toBe(200);
    expect(first.body.session.format).toBe('SIX_MAX_100BB_POSTFLOP');
    expect(first.body.scenario.street).toBe('flop');
    expect(first.body.scenario.board).toHaveLength(3);
    expect(first.body.scenario).not.toHaveProperty('deck');
    expect(first.body.scenario).not.toHaveProperty('engineSnapshot');
    expect(second.body.session.id).toBe(first.body.session.id);
    expect(second.body.scenario.id).toBe(first.body.scenario.id);
    const actionType = first.body.scenario.legalActions.actions.includes('check') ? 'check' : 'call';
    const decision = await agent.post('/api/trainer/postflop/session/decisions').send({ scenarioId: first.body.scenario.id, requestId: 'postflop-request-1', action: { type: actionType } });
    const retry = await agent.post('/api/trainer/postflop/session/decisions').send({ scenarioId: first.body.scenario.id, requestId: 'postflop-request-1', action: { type: actionType } });
    expect(decision.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.body.duplicate).toBe(true);
  });

  it('rejects continuation without a decision and advances after a persisted decision', async () => {
    await request(app).post('/api/auth/register').send({ email: 'next@example.com', username: 'NextUser', password: 'correcthorse' });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'next@example.com', password: 'correcthorse' });
    const start = await agent.post('/api/trainer/postflop/session/start').send({});
    const scenario = start.body.scenario;
    const missing = await agent.post('/api/trainer/postflop/session/next').send({ decisionId: '00000000-0000-0000-0000-000000000001', requestId: 'missing' });
    expect(missing.status).toBe(409);
    const type = scenario.legalActions.actions.includes('check') ? 'check' : 'call';
    const decision = await agent.post('/api/trainer/postflop/session/decisions').send({ scenarioId: scenario.id, requestId: 'advance-1', action: { type } });
    const next = await agent.post('/api/trainer/postflop/session/next').send({ decisionId: decision.body.decision.id, requestId: 'next-1' });
    expect(next.status).toBe(201);
    expect(next.body.scenario?.street ?? next.body.session.status).toBe('turn');
  });
});
