import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { prisma } from '../../src/db/prisma/client.js';
import { cleanupStrategyAdministrationFixtures, validStrategyRow } from '../fixtures/strategy-administration.js';

const app = buildTestApp();

async function loggedIn(role: 'USER' | 'EDITOR' | 'REVIEWER' | 'PUBLISHER' | 'ADMIN', prefix: string) {
  const suffix = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${suffix}@example.com`;
  const username = `Governance${Math.random().toString(36).slice(2, 14)}`;
  await request(app).post('/api/auth/register').send({ email, username, password: 'correcthorse' });
  const user = await prisma.user.update({ where: { email }, data: { editorialRole: role } });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return { agent, user };
}

async function publishedVersion() {
  const editor = await loggedIn('EDITOR', 'governance-editor');
  const reviewer = await loggedIn('REVIEWER', 'governance-reviewer');
  const publisher = await loggedIn('PUBLISHER', 'governance-publisher');
  const dataset = await editor.agent.post('/api/strategy/admin/datasets').send({ key: `governance-${Date.now()}`, name: 'Governance dataset' });
  const draft = await editor.agent.post(`/api/strategy/admin/datasets/${dataset.body.id}/versions`).send({
    version: 'governance-v1', schemaVersion: '1', gameFormat: 'SIX_MAX_100BB_POSTFLOP', street: 'flop', tableSize: 6,
    stackAssumptions: ['100bb'], blindAssumptions: ['no-ante'], source: 'security', assumptions: [], precision: 0.000001
  });
  await editor.agent.put(`/api/strategy/admin/versions/${draft.body.id}`).send({ expectedRevision: 0, rows: [validStrategyRow()] });
  await reviewer.agent.post(`/api/strategy/admin/versions/${draft.body.id}/validate`);
  const published = await publisher.agent.post(`/api/strategy/admin/versions/${draft.body.id}/publish`).send({ expectedRevision: 1 });
  return { datasetId: dataset.body.id as string, versionId: draft.body.id as string, publisher, published: published.body };
}

describe('strategy administration governance security', () => {
  beforeEach(async () => { await cleanupStrategyAdministrationFixtures(); await resetDatabase(); });
  afterAll(() => disconnectDatabase());

  it('does not reveal catalog, history, draft, or audit data to a base user', async () => {
    const user = await loggedIn('USER', 'governance-user');
    const admin = await loggedIn('ADMIN', 'governance-admin');
    const version = await publishedVersion();

    expect((await user.agent.get('/api/strategy/admin/datasets')).status).toBe(403);
    expect((await user.agent.get(`/api/strategy/admin/datasets/${version.datasetId}/history`)).status).toBe(403);
    expect((await user.agent.get(`/api/strategy/admin/versions/${version.versionId}`)).status).toBe(403);
    expect((await user.agent.get('/api/strategy/admin/audit')).status).toBe(403);
    const audit = await admin.agent.get('/api/strategy/admin/audit?limit=100');
    expect(JSON.stringify(audit.body)).not.toContain('correcthorse');
  });

  it('requires a retirement reason and makes retirement idempotently terminal', async () => {
    const version = await publishedVersion();
    const noReason = await version.publisher.agent.post(`/api/strategy/admin/versions/${version.versionId}/retire`).send({});
    expect(noReason.status).toBe(400);
    expect(noReason.body.error.code).toBe('RETIRE_REASON_REQUIRED');

    const retired = await version.publisher.agent.post(`/api/strategy/admin/versions/${version.versionId}/retire`).send({ reason: 'Superseded by review' });
    expect(retired.status).toBe(200);
    expect(retired.body.status).toBe('RETIRED');
    const repeated = await version.publisher.agent.post(`/api/strategy/admin/versions/${version.versionId}/retire`).send({ reason: 'Repeated request' });
    expect(repeated.status).toBe(409);
    expect(repeated.body.error.code).toBe('INVALID_STATE_TRANSITION');
    expect(await prisma.publicationRecord.count({ where: { datasetVersionId: version.versionId, action: 'RETIRE' } })).toBe(1);
  });
});
