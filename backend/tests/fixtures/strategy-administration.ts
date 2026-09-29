import type { EditorialRole } from '@prisma/client';
import { prisma } from '../../src/db/prisma/client.js';

export function editorialUserData(role: EditorialRole = 'USER', suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`) {
  return {
    email: `strategy-${suffix}@example.com`,
    username: `Strategy${suffix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`,
    usernameNormalized: `strategy${suffix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24).toLowerCase()}`,
    passwordHash: 'test-only-password-hash',
    editorialRole: role
  };
}

export async function createEditorialUser(role: EditorialRole = 'USER') {
  return prisma.user.create({ data: editorialUserData(role) });
}

export async function createStrategyDataset(key = `dataset-${Date.now()}`) {
  return prisma.strategyDataset.create({ data: { key, name: 'Test strategy dataset', description: 'Feature 012 fixture' } });
}

export function validStrategyRow(contextKey = 'flop|BTN|100bb|checked-to-hero') {
  return {
    contextKey,
    rangeSnapshot: null,
    actions: [
      { action: { type: 'check' }, frequency: 0.2 },
      { action: { type: 'bet', amountBB: 3.3 }, frequency: 0.8 }
    ],
    factors: ['position', 'effective stack'],
    assumptions: [],
    conditions: []
  };
}

export async function createStrategyDraft(datasetId: string, createdById: string, version = `draft-${Date.now()}`) {
  return prisma.strategyDatasetVersion.create({
    data: {
      datasetId,
      version,
      schemaVersion: '1',
      gameFormat: 'SIX_MAX_100BB_POSTFLOP',
      street: 'flop',
      tableSize: 6,
      stackAssumptions: ['100bb'],
      blindAssumptions: ['no-ante'],
      source: 'fixture',
      assumptions: [],
      precision: 0.000001,
      status: 'DRAFT',
      compatibilityKey: `${datasetId}|six_max_100bb_postflop|flop|6|["100bb"]|["no-ante"]`,
      createdById,
      rows: { create: [validStrategyRow()] }
    },
    include: { rows: true }
  });
}

export async function cleanupStrategyAdministrationFixtures() {
  await prisma.editorialAuditEntry.deleteMany({});
  await prisma.publicationRecord.deleteMany({});
  await prisma.strategyDatasetVersion.deleteMany({ where: { dataset: { key: { startsWith: 'dataset-' } } } });
  await prisma.strategyDataset.deleteMany({ where: { key: { startsWith: 'dataset-' } } });
}
