import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { prisma } from '../../src/db/prisma/client.js';
import { cleanupStrategyAdministrationFixtures } from '../fixtures/strategy-administration.js';

const app = buildTestApp();

async function loggedIn(role: 'REVIEWER' | 'ADMIN', prefix: string) {
  const suffix = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${suffix}@example.com`;
  await request(app).post('/api/auth/register').send({ email, username: `Perf${Math.random().toString(36).slice(2, 14)}`, password: 'correcthorse' });
  await prisma.user.update({ where: { email }, data: { editorialRole: role } });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('strategy administration performance', () => {
  beforeEach(async () => { await cleanupStrategyAdministrationFixtures(); await resetDatabase(); });
  afterAll(() => disconnectDatabase());

  it('keeps history and audit reads bounded for 1,000 records', async () => {
    const reviewer = await loggedIn('REVIEWER', 'performance-reviewer');
    const admin = await loggedIn('ADMIN', 'performance-admin');
    const dataset = await prisma.strategyDataset.create({ data: { key: `dataset-performance-${Date.now()}`, name: 'Performance dataset' } });
    const versions = Array.from({ length: 1000 }, (_, index) => ({
      datasetId: dataset.id,
      version: `v-${index}`,
      schemaVersion: '1',
      gameFormat: 'SIX_MAX_100BB_POSTFLOP',
      street: 'flop',
      tableSize: 6,
      stackAssumptions: ['100bb'],
      blindAssumptions: ['no-ante'],
      source: 'performance',
      assumptions: [],
      precision: 0.000001,
      status: 'RETIRED' as const,
      compatibilityKey: `${dataset.id}|performance|${index}`
    }));
    await prisma.strategyDatasetVersion.createMany({ data: versions });
    const actor = await prisma.user.findFirstOrThrow({ where: { email: { contains: 'performance-admin' } } });
    await prisma.editorialAuditEntry.createMany({ data: Array.from({ length: 1000 }, (_, index) => ({
      actorId: actor.id,
      actorRole: 'ADMIN' as const,
      action: 'READ',
      entityType: 'StrategyDatasetVersion',
      entityId: dataset.id,
      result: 'SUCCESS',
      metadata: { index }
    })) });

    const historyStart = performance.now();
    const history = await reviewer.get(`/api/strategy/admin/datasets/${dataset.id}/history`);
    const historyElapsed = performance.now() - historyStart;
    const auditStart = performance.now();
    const audit = await admin.get('/api/strategy/admin/audit?limit=1000');
    const auditElapsed = performance.now() - auditStart;

    expect(history.status).toBe(200);
    expect(history.body.history).toHaveLength(1000);
    expect(audit.status).toBe(200);
    expect(audit.body.entries.length).toBeLessThanOrEqual(100);
    expect(historyElapsed).toBeLessThan(2000);
    expect(auditElapsed).toBeLessThan(2000);
  });
});
