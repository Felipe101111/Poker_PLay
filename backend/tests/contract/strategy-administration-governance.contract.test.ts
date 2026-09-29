import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { prisma } from '../../src/db/prisma/client.js';
import { cleanupStrategyAdministrationFixtures } from '../fixtures/strategy-administration.js';

const app = buildTestApp();

async function loggedIn(role: 'ADMIN' | 'PUBLISHER' | 'REVIEWER', prefix: string) {
  const suffix = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${suffix}@example.com`;
  await request(app).post('/api/auth/register').send({ email, username: suffix.slice(0, 20), password: 'correcthorse' });
  const user = await prisma.user.update({ where: { email }, data: { editorialRole: role } });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return { agent, user };
}

describe('strategy administration governance contract', () => {
  beforeEach(async () => { await cleanupStrategyAdministrationFixtures(); await resetDatabase(); });
  afterAll(() => disconnectDatabase());

  it('allows admin role assignment and exposes filtered audit entries', async () => {
    const admin = await loggedIn('ADMIN', 'governance-admin');
    const target = await loggedIn('REVIEWER', 'governance-target');
    const updated = await admin.agent.patch(`/api/strategy/admin/users/${target.user.id}/role`).send({ role: 'EDITOR' });
    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({ id: target.user.id, role: 'EDITOR' });
    const audit = await admin.agent.get('/api/strategy/admin/audit?limit=50');
    expect(audit.status).toBe(200);
    expect(audit.body.entries).toEqual(expect.any(Array));
    expect(JSON.stringify(audit.body)).not.toContain('correcthorse');
  });

  it('rejects history access for a base reviewer boundary and validates retirement reasons', async () => {
    const reviewer = await loggedIn('REVIEWER', 'governance-reviewer');
    const missingReason = await reviewer.agent.post('/api/strategy/admin/versions/missing/retire').send({});
    expect(missingReason.status).toBe(403);
    const history = await reviewer.agent.get('/api/strategy/admin/datasets/missing/history');
    expect(history.status).toBe(404);
  });
});
