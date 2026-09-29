import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { prisma } from '../../src/db/prisma/client.js';
import { cleanupStrategyAdministrationFixtures, validStrategyRow } from '../fixtures/strategy-administration.js';

const app = buildTestApp();

async function loggedIn(role: 'EDITOR' | 'REVIEWER' | 'PUBLISHER', prefix: string) {
  const suffix = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${suffix}@example.com`;
  await request(app).post('/api/auth/register').send({ email, username: suffix.slice(0, 20), password: 'correcthorse' });
  await prisma.user.update({ where: { email }, data: { editorialRole: role } });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('strategy administration publication contract', () => {
  beforeEach(async () => { await cleanupStrategyAdministrationFixtures(); await resetDatabase(); });
  afterAll(() => disconnectDatabase());

  it('returns a validation report and publishes only after successful validation', async () => {
    const editor = await loggedIn('EDITOR', 'publication-editor');
    const reviewer = await loggedIn('REVIEWER', 'publication-reviewer');
    const publisher = await loggedIn('PUBLISHER', 'publication-publisher');
    const dataset = await editor.post('/api/strategy/admin/datasets').send({ key: `publish-${Date.now()}`, name: 'Publication dataset' });
    const draft = await editor.post(`/api/strategy/admin/datasets/${dataset.body.id}/versions`).send({
      version: 'publish-v1', schemaVersion: '1', gameFormat: 'SIX_MAX_100BB_POSTFLOP', street: 'flop', tableSize: 6,
      stackAssumptions: ['100bb'], blindAssumptions: ['no-ante'], source: 'contract', assumptions: [], precision: 0.000001
    });
    await editor.put(`/api/strategy/admin/versions/${draft.body.id}`).send({ expectedRevision: 0, rows: [validStrategyRow()] });
    const validation = await reviewer.post(`/api/strategy/admin/versions/${draft.body.id}/validate`);
    expect(validation.status).toBe(200);
    expect(validation.body.status).toBe('PASSED');
    const published = await publisher.post(`/api/strategy/admin/versions/${draft.body.id}/publish`).send({ expectedRevision: 1 });
    expect(published.status).toBe(200);
    expect(published.body.status).toBe('PUBLISHED');
    expect(published.body.activeCompatibilityKey).toBeTruthy();
  });

  it('keeps invalid drafts in DRAFT and blocks publication', async () => {
    const editor = await loggedIn('EDITOR', 'invalid-editor');
    const publisher = await loggedIn('PUBLISHER', 'invalid-publisher');
    const dataset = await editor.post('/api/strategy/admin/datasets').send({ key: `invalid-${Date.now()}`, name: 'Invalid dataset' });
    const draft = await editor.post(`/api/strategy/admin/datasets/${dataset.body.id}/versions`).send({
      version: 'invalid-v1', schemaVersion: '1', gameFormat: 'SIX_MAX_100BB_POSTFLOP', street: 'flop', tableSize: 6,
      stackAssumptions: ['100bb'], blindAssumptions: ['no-ante'], source: 'contract', assumptions: [], precision: 0.000001
    });
    const validation = await publisher.post(`/api/strategy/admin/versions/${draft.body.id}/validate`);
    expect(validation.status).toBe(403);
    const blocked = await publisher.post(`/api/strategy/admin/versions/${draft.body.id}/publish`).send({ expectedRevision: 0 });
    expect(blocked.status).toBe(422);
    expect(blocked.body.error.code).toBe('VALIDATION_FAILED');
  });
});
