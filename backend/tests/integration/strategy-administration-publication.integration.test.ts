import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { prisma } from '../../src/db/prisma/client.js';
import { cleanupStrategyAdministrationFixtures, validStrategyRow } from '../fixtures/strategy-administration.js';

const app = buildTestApp();

async function loggedIn(role: 'EDITOR' | 'REVIEWER' | 'PUBLISHER', prefix: string) {
  const suffix = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${suffix}@example.com`;
  const username = `Strategy${Math.random().toString(36).slice(2, 14)}`;
  await request(app).post('/api/auth/register').send({ email, username, password: 'correcthorse' });
  await prisma.user.update({ where: { email }, data: { editorialRole: role } });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

async function createDraft(editor: request.Agent, key: string, version: string) {
  const dataset = await editor.post('/api/strategy/admin/datasets').send({ key, name: key });
  const draft = await editor.post(`/api/strategy/admin/datasets/${dataset.body.id}/versions`).send({
    version, schemaVersion: '1', gameFormat: 'SIX_MAX_100BB_POSTFLOP', street: 'flop', tableSize: 6,
    stackAssumptions: ['100bb'], blindAssumptions: ['no-ante'], source: 'integration', assumptions: [], precision: 0.000001
  });
  return { datasetId: dataset.body.id as string, draftId: draft.body.id as string };
}

describe('strategy administration publication integration', () => {
  beforeEach(async () => { await cleanupStrategyAdministrationFixtures(); await resetDatabase(); });
  afterAll(() => disconnectDatabase());

  it('rolls back invalid publication and preserves historical snapshots while replacing active versions', async () => {
    const editor = await loggedIn('EDITOR', 'publication-integration-editor');
    const reviewer = await loggedIn('REVIEWER', 'publication-integration-reviewer');
    const publisher = await loggedIn('PUBLISHER', 'publication-integration-publisher');
    const { datasetId, draftId } = await createDraft(editor, `integration-${Date.now()}`, 'v1');
    await editor.put(`/api/strategy/admin/versions/${draftId}`).send({ expectedRevision: 0, rows: [validStrategyRow()] });
    await reviewer.post(`/api/strategy/admin/versions/${draftId}/validate`);
    const published = await publisher.post(`/api/strategy/admin/versions/${draftId}/publish`).send({ expectedRevision: 1 });
    expect(published.status).toBe(200);

    const snapshot = await prisma.evaluationSnapshot.create({
      data: {
        userId: (await prisma.user.findFirstOrThrow({ where: { email: { contains: 'publication-integration-editor' } } })).id,
        datasetVersionId: draftId,
        strategyVersionSnapshot: published.body,
        strategyRowSnapshot: published.body.rows,
        contextSnapshot: {},
        equitySnapshot: {},
        availability: 'AVAILABLE'
      }
    });
    const retry = await publisher.post(`/api/strategy/admin/versions/${draftId}/publish`).send({ expectedRevision: 1 });
    expect(retry.status).toBe(409);
    expect((await prisma.evaluationSnapshot.findUniqueOrThrow({ where: { id: snapshot.id } })).strategyVersionSnapshot).toEqual(published.body);

    const replacement = await editor.post(`/api/strategy/admin/datasets/${datasetId}/versions`).send({
      version: 'v2', schemaVersion: '1', gameFormat: 'SIX_MAX_100BB_POSTFLOP', street: 'flop', tableSize: 6,
      stackAssumptions: ['100bb'], blindAssumptions: ['no-ante'], source: 'replacement', assumptions: [], precision: 0.000001
    });
    expect(replacement.status).toBe(201);
    await editor.put(`/api/strategy/admin/versions/${replacement.body.id}`).send({ expectedRevision: 0, rows: [validStrategyRow()] });
    await reviewer.post(`/api/strategy/admin/versions/${replacement.body.id}/validate`);
    const second = await publisher.post(`/api/strategy/admin/versions/${replacement.body.id}/publish`).send({ expectedRevision: 1 });
    expect(second.status).toBe(200);
    expect(await prisma.strategyDatasetVersion.count({ where: { datasetId, status: 'PUBLISHED' } })).toBe(1);
    expect((await prisma.evaluationSnapshot.findUniqueOrThrow({ where: { id: snapshot.id } })).strategyVersionSnapshot).toEqual(published.body);
    expect((await prisma.strategyDatasetVersion.findUniqueOrThrow({ where: { id: draftId } })).status).toBe('RETIRED');
  });

  it('returns row-level validation failures and leaves the draft unchanged', async () => {
    const editor = await loggedIn('EDITOR', 'publication-invalid-editor');
    const reviewer = await loggedIn('REVIEWER', 'publication-invalid-reviewer');
    const { draftId } = await createDraft(editor, `invalid-integration-${Date.now()}`, 'invalid');
    const response = await reviewer.post(`/api/strategy/admin/versions/${draftId}/validate`);
    const stored = await prisma.strategyDatasetVersion.findUniqueOrThrow({ where: { id: draftId } });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('FAILED');
    expect(response.body.errorCount).toBeGreaterThan(0);
    expect(stored.status).toBe('DRAFT');
    expect(stored.revision).toBe(0);
  });
});
