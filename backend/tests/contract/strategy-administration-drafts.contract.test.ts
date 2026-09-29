import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { prisma } from '../../src/db/prisma/client.js';
import { cleanupStrategyAdministrationFixtures } from '../fixtures/strategy-administration.js';

const app = buildTestApp();

async function loggedIn(role: 'EDITOR' | 'USER', prefix: string) {
  const suffix = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${suffix}@example.com`;
  await request(app).post('/api/auth/register').send({ email, username: suffix.slice(0, 20), password: 'correcthorse' });
  await prisma.user.update({ where: { email }, data: { editorialRole: role } });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('strategy administration draft contract', () => {
  beforeEach(async () => {
    await cleanupStrategyAdministrationFixtures();
    await resetDatabase();
  });
  afterAll(() => disconnectDatabase());

  it('creates a draft with a revision and reads it back for an editor', async () => {
    const editor = await loggedIn('EDITOR', 'draft-editor');
    const createdDataset = await editor.post('/api/strategy/admin/datasets').send({ key: `draft-${Date.now()}`, name: 'Draft dataset' });
    expect(createdDataset.status).toBe(201);
    const created = await editor.post(`/api/strategy/admin/datasets/${createdDataset.body.id}/versions`).send({
      version: 'draft-v1', schemaVersion: '1', gameFormat: 'SIX_MAX_100BB_POSTFLOP', street: 'flop', tableSize: 6,
      stackAssumptions: ['100bb'], blindAssumptions: ['no-ante'], source: 'contract', assumptions: [], precision: 0.000001
    });
    expect(created.status).toBe(201);
    expect(created.body.status).toBe('DRAFT');
    expect(created.body.revision).toBe(0);
    const read = await editor.get(`/api/strategy/admin/versions/${created.body.id}`);
    expect(read.status).toBe(200);
    expect(read.body.revision).toBe(0);
  });

  it('rejects editorial access for a base user without revealing a draft', async () => {
    const user = await loggedIn('USER', 'draft-user');
    const response = await user.get('/api/strategy/admin/datasets');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(response.body).not.toHaveProperty('datasets');
  });
});
