import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

async function loggedIn(email: string, username: string) {
  await request(app).post('/api/auth/register').send({ email, username, password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('trainer session contract', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('requires authentication', async () => {
    const response = await request(app).post('/api/trainer/session/start').send({});
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('creates and resumes one redacted six-player scenario', async () => {
    const agent = await loggedIn('trainer@example.com', 'Trainer');
    const first = await agent.post('/api/trainer/session/start').send({});
    const second = await agent.post('/api/trainer/session/start').send({});

    expect(first.status).toBe(200);
    expect(first.body.session.status).toBe('ACTIVE');
    expect(first.body.scenario.tableSize).toBe(6);
    expect(first.body.scenario.effectiveStackBB).toBe(100);
    expect(first.body.scenario.holeCards).toHaveLength(2);
    expect(first.body.scenario).not.toHaveProperty('engineSnapshot');
    expect(first.body.scenario).not.toHaveProperty('deck');
    expect(second.body.session.id).toBe(first.body.session.id);
    expect(second.body.scenario.id).toBe(first.body.scenario.id);
  });
});