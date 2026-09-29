import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { prisma } from '../../src/db/prisma/client.js';
import { cleanupStrategyAdministrationFixtures, validStrategyRow } from '../fixtures/strategy-administration.js';

const app = buildTestApp();

async function loggedIn(role: 'EDITOR' | 'REVIEWER' | 'PUBLISHER', prefix: string) {
  const suffix = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${suffix}@example.com`;
  await request(app).post('/api/auth/register').send({ email, username: `History${Math.random().toString(36).slice(2, 14)}`, password: 'correcthorse' });
  const user = await prisma.user.update({ where: { email }, data: { editorialRole: role } });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return { agent, user };
}

describe('strategy administration governance integration', () => {
  beforeEach(async () => { await cleanupStrategyAdministrationFixtures(); await resetDatabase(); });
  afterAll(() => disconnectDatabase());

  it('records chronological publication history and retirement metadata without changing prior rows', async () => {
    const editor = await loggedIn('EDITOR', 'history-editor');
    const reviewer = await loggedIn('REVIEWER', 'history-reviewer');
    const publisher = await loggedIn('PUBLISHER', 'history-publisher');
    const dataset = await editor.agent.post('/api/strategy/admin/datasets').send({ key: `history-${Date.now()}`, name: 'History dataset' });
    const draft = await editor.agent.post(`/api/strategy/admin/datasets/${dataset.body.id}/versions`).send({
      version: 'history-v1', schemaVersion: '1', gameFormat: 'SIX_MAX_100BB_POSTFLOP', street: 'flop', tableSize: 6,
      stackAssumptions: ['100bb'], blindAssumptions: ['no-ante'], source: 'history', assumptions: [], precision: 0.000001
    });
    await editor.agent.put(`/api/strategy/admin/versions/${draft.body.id}`).send({ expectedRevision: 0, rows: [validStrategyRow()] });
    await reviewer.agent.post(`/api/strategy/admin/versions/${draft.body.id}/validate`);
    const published = await publisher.agent.post(`/api/strategy/admin/versions/${draft.body.id}/publish`).send({ expectedRevision: 1 });
    const before = await prisma.strategyRow.findMany({ where: { datasetVersionId: draft.body.id } });
    const retired = await publisher.agent.post(`/api/strategy/admin/versions/${draft.body.id}/retire`).send({ reason: 'Corrected source' });
    const history = await reviewer.agent.get(`/api/strategy/admin/datasets/${dataset.body.id}/history`);
    const audit = await prisma.editorialAuditEntry.findMany({ where: { entityId: draft.body.id }, orderBy: { createdAt: 'asc' } });
    const after = await prisma.strategyRow.findMany({ where: { datasetVersionId: draft.body.id } });

    expect(published.status).toBe(200);
    expect(retired.status).toBe(200);
    expect(history.status).toBe(200);
    expect(history.body.history.map((entry: { status: string }) => entry.status)).toEqual(['RETIRED']);
    expect(history.body.history[0].retiredAt).toBeTruthy();
    expect(audit.map((entry) => entry.action)).toEqual(['PUBLISH', 'RETIRE']);
    expect(audit[1].reason).toBe('Corrected source');
    expect(after).toEqual(before);
  });
});
