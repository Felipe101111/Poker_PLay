import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { strategyAdminError } from './strategy.admin.errors.js';
import { strategyAdminRepository, type StrategyAdminRepository } from './strategy.admin.repository.js';
import type { StrategyActionInput, StrategyDatasetSummary, StrategyRowInput, StrategyVersionMetadataInput } from './strategy.admin.types.js';
import { compatibilityKey, strategyDatasetSchema, strategyDraftUpdateSchema, strategyRetireSchema, strategyRoleSchema, strategyVersionMetadataSchema, validateStrategyRows } from './strategy.admin.validation.js';

function asStringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

type StrategyVersionWithRows = Prisma.StrategyDatasetVersionGetPayload<{ include: { rows: true } }>;

function toVersion(version: StrategyVersionWithRows) {
  return {
    id: version.id,
    datasetId: version.datasetId,
    version: version.version,
    status: version.status,
    revision: version.revision,
    compatibilityKey: version.compatibilityKey,
    activeCompatibilityKey: version.activeCompatibilityKey,
    metadata: {
      version: version.version,
      schemaVersion: version.schemaVersion,
      gameFormat: version.gameFormat,
      street: version.street,
      tableSize: version.tableSize,
      stackAssumptions: asStringArray(version.stackAssumptions),
      blindAssumptions: asStringArray(version.blindAssumptions),
      source: version.source,
      assumptions: asStringArray(version.assumptions),
      precision: Number(version.precision)
    },
    contentHash: version.contentHash,
    validationReport: version.validationReport,
    rows: version.rows.map((row) => ({
      contextKey: row.contextKey,
      range: row.rangeSnapshot,
      actions: row.actions as unknown as StrategyActionInput[],
      factors: row.factors as unknown as string[],
      assumptions: row.assumptions as unknown as string[],
      conditions: row.conditions as unknown as string[]
    })),
    createdById: version.createdById,
    publishedById: version.publishedById,
    retiredById: version.retiredById,
    createdAt: version.createdAt.toISOString(),
    updatedAt: version.updatedAt.toISOString(),
    publishedAt: version.publishedAt?.toISOString() ?? null,
    retiredAt: version.retiredAt?.toISOString() ?? null
  };
}

export class StrategyAdminService {
  constructor(private readonly repository: StrategyAdminRepository) {}

  async listDatasets(): Promise<StrategyDatasetSummary[]> {
    const datasets = await this.repository.listDatasets();
    return datasets.map((dataset) => ({
      id: dataset.id,
      key: dataset.key,
      name: dataset.name,
      description: dataset.description,
      activeVersions: dataset.versions.map((version) => ({ id: version.id, version: version.version, compatibilityKey: version.compatibilityKey, publishedAt: version.publishedAt?.toISOString() ?? null }))
    }));
  }

  async createDataset(input: unknown) {
    const parsed = strategyDatasetSchema.safeParse(input);
    if (!parsed.success) throw strategyAdminError.invalidInput(parsed.error.issues[0]?.message);
    return this.repository.createDataset(parsed.data);
  }

  async createDraft(datasetId: string, input: unknown, createdById: string) {
    const parsed = strategyVersionMetadataSchema.safeParse(input);
    if (!parsed.success) throw strategyAdminError.invalidInput(parsed.error.issues[0]?.message);
    const created = await this.repository.createDraft(datasetId, parsed.data, createdById, compatibilityKey(datasetId, parsed.data));
    return toVersion(created);
  }

  async getVersion(id: string) {
    const version = await this.repository.getVersion(id);
    if (!version) throw strategyAdminError.notFound();
    return toVersion(version);
  }

  async updateDraft(id: string, input: unknown) {
    const parsed = strategyDraftUpdateSchema.safeParse(input);
    if (!parsed.success) throw strategyAdminError.invalidInput(parsed.error.issues[0]?.message);
    const existing = await this.repository.getVersion(id);
    if (!existing) throw strategyAdminError.notFound();
    if (existing.status !== 'DRAFT') throw strategyAdminError.invalidState('Only drafts can be edited');
    const metadata: StrategyVersionMetadataInput = {
      version: existing.version,
      schemaVersion: existing.schemaVersion,
      gameFormat: existing.gameFormat,
      street: existing.street as StrategyVersionMetadataInput['street'],
      tableSize: existing.tableSize,
      stackAssumptions: asStringArray(existing.stackAssumptions),
      blindAssumptions: asStringArray(existing.blindAssumptions),
      source: existing.source,
      assumptions: asStringArray(existing.assumptions),
      precision: Number(existing.precision),
      ...parsed.data.metadata
    };
    if (parsed.data.rows) {
      const rows = parsed.data.rows as StrategyRowInput[];
      const report = validateStrategyRows(rows, metadata, 'system');
      if (report.status === 'FAILED') throw strategyAdminError.validationFailed(report.issues[0]?.message);
    }
    const result = await this.repository.updateDraft(id, parsed.data.expectedRevision, parsed.data.metadata ?? {}, parsed.data.rows);
    if (!result) throw strategyAdminError.notFound();
    if ('conflict' in result) throw strategyAdminError.draftConflict();
    return toVersion(result);
  }

  async validateVersion(id: string, validatedById: string) {
    const existing = await this.repository.getVersion(id);
    if (!existing) throw strategyAdminError.notFound();
    const metadata: StrategyVersionMetadataInput = {
      version: existing.version, schemaVersion: existing.schemaVersion, gameFormat: existing.gameFormat, street: existing.street as StrategyVersionMetadataInput['street'], tableSize: existing.tableSize,
      stackAssumptions: asStringArray(existing.stackAssumptions), blindAssumptions: asStringArray(existing.blindAssumptions), source: existing.source, assumptions: asStringArray(existing.assumptions), precision: Number(existing.precision)
    };
    const rows = existing.rows.map((row) => ({ contextKey: row.contextKey, range: row.rangeSnapshot, actions: row.actions, factors: row.factors, assumptions: row.assumptions, conditions: row.conditions })) as unknown as StrategyRowInput[];
    const report = validateStrategyRows(rows, metadata, validatedById);
    await this.repository.saveValidation(id, report);
    return report;
  }

  async publishVersion(id: string, input: unknown, actorId: string, actorRole: 'PUBLISHER' | 'ADMIN') {
    const parsed = z.object({ expectedRevision: z.number().int().nonnegative() }).safeParse(input);
    if (!parsed.success) throw strategyAdminError.invalidInput(parsed.error.issues[0]?.message);
    const existing = await this.repository.getVersion(id);
    if (!existing) throw strategyAdminError.notFound();
    const report = existing.validationReport as { status?: string } | null;
    if (!report || report.status !== 'PASSED') throw strategyAdminError.validationFailed('A successful validation is required before publication');
    const contentHash = Buffer.from(JSON.stringify(existing.rows)).toString('base64url');
    const result = await this.repository.publish(id, parsed.data.expectedRevision, actorId, actorRole, contentHash, report);
    if (!result) throw strategyAdminError.notFound();
    if ('conflict' in result) throw strategyAdminError.draftConflict();
    return toVersion(result);
  }

  async retireVersion(id: string, input: unknown, actorId: string, actorRole: 'PUBLISHER' | 'ADMIN') {
    const parsed = strategyRetireSchema.safeParse(input);
    if (!parsed.success) throw strategyAdminError.retireReasonRequired();
    const result = await this.repository.retire(id, actorId, actorRole, parsed.data.reason);
    if (!result) throw strategyAdminError.notFound();
    if ('invalidState' in result) throw strategyAdminError.invalidState('Only published versions can be retired');
    return toVersion(result);
  }

  async history(datasetId: string) {
    const rows = await this.repository.history(datasetId);
    if (rows.length === 0) throw strategyAdminError.notFound();
    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), publishedAt: row.publishedAt?.toISOString() ?? null, retiredAt: row.retiredAt?.toISOString() ?? null }));
  }

  async audit(limit: number) {
    const rows = await this.repository.audit(Math.min(Math.max(limit, 1), 100));
    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  }

  async assignRole(userId: string, input: unknown, actorId: string) {
    const parsed = strategyRoleSchema.safeParse(input);
    if (!parsed.success) throw strategyAdminError.invalidInput(parsed.error.issues[0]?.message);
    try { return await this.repository.assignRole(userId, parsed.data.role, actorId); } catch (error) { if (error instanceof Error && error.message.includes('Record to update not found')) throw strategyAdminError.notFound(); throw error; }
  }
}

export const strategyAdminService = new StrategyAdminService(strategyAdminRepository);
