import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma/client.js';
import type { StrategyRowInput, StrategyVersionMetadataInput } from './strategy.admin.types.js';

const json = (value: unknown) => value as Prisma.InputJsonValue;

export class StrategyAdminRepository {
  listDatasets() {
    return prisma.strategyDataset.findMany({
      orderBy: { key: 'asc' },
      include: { versions: { where: { status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' } } }
    });
  }

  createDataset(input: { key: string; name: string; description?: string | null }) {
    return prisma.strategyDataset.create({ data: input });
  }

  createDraft(datasetId: string, metadata: StrategyVersionMetadataInput, createdById: string, compatibilityKey: string) {
    return prisma.strategyDatasetVersion.create({
      data: {
        datasetId,
        ...metadata,
        stackAssumptions: json(metadata.stackAssumptions),
        blindAssumptions: json(metadata.blindAssumptions),
        assumptions: json(metadata.assumptions),
        precision: metadata.precision,
        status: 'DRAFT',
        compatibilityKey,
        createdById
      },
      include: { rows: true }
    });
  }

  getVersion(id: string) {
    return prisma.strategyDatasetVersion.findUnique({ where: { id }, include: { rows: true } });
  }

  async updateDraft(id: string, expectedRevision: number, metadata: Partial<StrategyVersionMetadataInput>, rows?: StrategyRowInput[]) {
    return prisma.$transaction(async (transaction) => {
      const existing = await transaction.strategyDatasetVersion.findUnique({ where: { id }, include: { rows: true } });
      if (!existing) return null;
      const updated = await transaction.strategyDatasetVersion.updateMany({
        where: { id, status: 'DRAFT', revision: expectedRevision },
        data: {
          ...metadata,
          ...(metadata.stackAssumptions ? { stackAssumptions: json(metadata.stackAssumptions) } : {}),
          ...(metadata.blindAssumptions ? { blindAssumptions: json(metadata.blindAssumptions) } : {}),
          ...(metadata.assumptions ? { assumptions: json(metadata.assumptions) } : {}),
          ...(metadata.precision !== undefined ? { precision: metadata.precision } : {}),
          revision: { increment: 1 }
        }
      });
      if (updated.count === 0) return { conflict: true as const };
      if (rows) {
        await transaction.strategyRow.deleteMany({ where: { datasetVersionId: id } });
        await transaction.strategyRow.createMany({ data: rows.map((row) => ({
          datasetVersionId: id,
          contextKey: row.contextKey,
          rangeSnapshot: json(row.range ?? null),
          actions: json(row.actions),
          factors: json(row.factors),
          assumptions: json(row.assumptions),
          conditions: json(row.conditions)
        })) });
      }
      return transaction.strategyDatasetVersion.findUnique({ where: { id }, include: { rows: true } });
    });
  }

  async saveValidation(id: string, report: unknown) {
    return prisma.strategyDatasetVersion.update({ where: { id }, data: { validationReport: json(report) }, include: { rows: true } });
  }

  async publish(id: string, expectedRevision: number, actorId: string, actorRole: 'PUBLISHER' | 'ADMIN', contentHash: string, report: unknown) {
    return prisma.$transaction(async (transaction) => {
      const draft = await transaction.strategyDatasetVersion.findUnique({ where: { id }, include: { rows: true } });
      if (!draft) return null;
      if (draft.status !== 'DRAFT' || draft.revision !== expectedRevision) return { conflict: true as const };
      await transaction.strategyDatasetVersion.updateMany({ where: { compatibilityKey: draft.compatibilityKey, status: 'PUBLISHED' }, data: { status: 'RETIRED', activeCompatibilityKey: null, retiredAt: new Date() } });
      const published = await transaction.strategyDatasetVersion.update({ where: { id }, data: { status: 'PUBLISHED', activeCompatibilityKey: draft.compatibilityKey, contentHash, validationReport: json(report), publishedById: actorId, publishedAt: new Date() }, include: { rows: true } });
      await transaction.publicationRecord.create({ data: { datasetVersionId: id, actorId, action: 'PUBLISH', reason: null } });
      await transaction.editorialAuditEntry.create({ data: { actorId, actorRole, action: 'PUBLISH', entityType: 'StrategyDatasetVersion', entityId: id, expectedRevision, result: 'SUCCESS' } });
      return published;
    });
  }

  async retire(id: string, actorId: string, actorRole: 'PUBLISHER' | 'ADMIN', reason: string) {
    return prisma.$transaction(async (transaction) => {
      const existing = await transaction.strategyDatasetVersion.findUnique({ where: { id }, include: { rows: true } });
      if (!existing) return null;
      if (existing.status !== 'PUBLISHED') return { invalidState: true as const };
      const retired = await transaction.strategyDatasetVersion.update({ where: { id }, data: { status: 'RETIRED', activeCompatibilityKey: null, retiredById: actorId, retiredAt: new Date() }, include: { rows: true } });
      await transaction.publicationRecord.create({ data: { datasetVersionId: id, actorId, action: 'RETIRE', reason } });
      await transaction.editorialAuditEntry.create({ data: { actorId, actorRole, action: 'RETIRE', entityType: 'StrategyDatasetVersion', entityId: id, result: 'SUCCESS', reason } });
      return retired;
    });
  }

  async history(datasetId: string) {
    return prisma.strategyDatasetVersion.findMany({ where: { datasetId }, orderBy: { createdAt: 'asc' }, select: { id: true, version: true, status: true, compatibilityKey: true, source: true, createdAt: true, publishedAt: true, retiredAt: true, createdById: true, publishedById: true, retiredById: true, validationReport: true } });
  }

  async audit(limit: number) {
    return prisma.editorialAuditEntry.findMany({ orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, actorId: true, actorRole: true, action: true, entityType: true, entityId: true, expectedRevision: true, result: true, reason: true, createdAt: true } });
  }

  async assignRole(userId: string, role: 'USER' | 'EDITOR' | 'REVIEWER' | 'PUBLISHER' | 'ADMIN', actorId: string) {
    return prisma.$transaction(async (transaction) => {
      const user = await transaction.user.update({ where: { id: userId }, data: { editorialRole: role }, select: { id: true, editorialRole: true } });
      await transaction.editorialAuditEntry.create({ data: { actorId, actorRole: 'ADMIN', action: 'ROLE_ASSIGN', entityType: 'User', entityId: userId, result: 'SUCCESS', metadata: json({ role }) } });
      return user;
    });
  }
}

export const strategyAdminRepository = new StrategyAdminRepository();
