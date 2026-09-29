import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { prisma } from '../../src/db/prisma/client.js';
import { cleanupStrategyAdministrationFixtures } from '../fixtures/strategy-administration.js';

const app = buildTestApp();

async function loggedIn(role: 'EDITOR' | 'REVIEWER', prefix: string) {
  const suffix = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${suffix}@example.com`;
  await request(app).post('/api/auth/register').send({ email, username: suffix.slice(0, 20), password: 'correcthorse' });
  await prisma.user.update({ where: { email }, data: { editorialRole: role } });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('strategy administration draft integration', () => {
  beforeEach(async () => {
    await cleanupStrategyAdministrationFixtures();
    await resetDatabase();
  });
  afterAll(() => disconnectDatabase());

  it('rejects stale revisions instead of overwriting another editor update', async () => {
    const editor = await loggedIn('EDITOR', 'revision-editor');
    const dataset = await editor.post('/api/strategy/admin/datasets').send({ key: `revision-${Date.now()}`, name: 'Revision dataset' });
    const draft = await editor.post(`/api/strategy/admin/datasets/${dataset.body.id}/versions`).send({
      version: 'draft-v1', schemaVersion: '1', gameFormat: 'SIX_MAX_100BB_POSTFLOP', street: 'flop', tableSize: 6,
      stackAssumptions: ['100bb'], blindAssumptions: ['no-ante'], source: 'integration', assumptions: [], precision: 0.000001
    });
    const first = await editor.put(`/api/strategy/admin/versions/${draft.body.id}`).send({ expectedRevision: 0, metadata: { source: 'first' } });
    expect(first.status).toBe(200);
    const stale = await editor.put(`/api/strategy/admin/versions/${draft.body.id}`).send({ expectedRevision: 0, metadata: { source: 'stale' } });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('DRAFT_CONFLICT');
  });

  it('allows a reviewer to read a draft but not mutate it', async () => {
    const reviewer = await loggedIn('REVIEWER', 'revision-reviewer');
    const response = await reviewer.post('/api/strategy/admin/datasets').send({ key: `review-${Date.now()}`, name: 'Review dataset' });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
