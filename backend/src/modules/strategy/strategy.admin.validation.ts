import { z } from 'zod';
import type { StrategyActionInput, StrategyRowInput, StrategyVersionMetadataInput, ValidationIssue, ValidationReport } from './strategy.admin.types.js';

const actionTypeSchema = z.enum(['fold', 'check', 'call', 'bet', 'raise', 'all-in']);

export const strategyAdminActionSchema = z.object({
  action: z.object({ type: actionTypeSchema, amountBB: z.number().finite().nonnegative().optional() }),
  frequency: z.number().finite().min(0).max(1)
});

export const strategyAdminRowSchema = z.object({
  contextKey: z.string().trim().min(1),
  range: z.unknown().nullable().optional().default(null),
  actions: z.array(strategyAdminActionSchema).min(1),
  factors: z.array(z.string()),
  assumptions: z.array(z.string()),
  conditions: z.array(z.string())
});

export const strategyVersionMetadataSchema = z.object({
  version: z.string().trim().min(1),
  schemaVersion: z.string().trim().min(1),
  gameFormat: z.string().trim().min(1),
  street: z.enum(['preflop', 'flop', 'turn', 'river']),
  tableSize: z.number().int().positive(),
  stackAssumptions: z.array(z.string()),
  blindAssumptions: z.array(z.string()),
  source: z.string().trim().min(1),
  assumptions: z.array(z.string()),
  precision: z.number().finite().positive()
});

export const strategyDatasetSchema = z.object({
  key: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional()
});

export const strategyDraftUpdateSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  metadata: strategyVersionMetadataSchema.partial().optional(),
  rows: z.array(strategyAdminRowSchema).optional()
});

export const strategyRetireSchema = z.object({ reason: z.string().trim().min(1).max(1000) });
export const strategyRoleSchema = z.object({ role: z.enum(['USER', 'EDITOR', 'REVIEWER', 'PUBLISHER', 'ADMIN']) });

export function normalizeContextKey(contextKey: string): string {
  return contextKey.trim().toLowerCase().replace(/\s+/g, ' ');
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).sort().join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function compatibilityKey(datasetId: string, metadata: Pick<StrategyVersionMetadataInput, 'gameFormat' | 'street' | 'tableSize' | 'stackAssumptions' | 'blindAssumptions'>): string {
  return [datasetId, metadata.gameFormat.trim().toLowerCase(), metadata.street, metadata.tableSize, stableJson(metadata.stackAssumptions), stableJson(metadata.blindAssumptions)].join('|');
}

export function normalizedRow(row: StrategyRowInput): StrategyRowInput {
  return {
    ...row,
    contextKey: normalizeContextKey(row.contextKey),
    actions: [...row.actions].sort((left, right) => `${left.action.type}:${left.action.amountBB ?? ''}`.localeCompare(`${right.action.type}:${right.action.amountBB ?? ''}`))
  };
}

export function validateStrategyRows(rows: StrategyRowInput[], metadata: StrategyVersionMetadataInput, validatedById: string, now = new Date().toISOString()): ValidationReport {
  const issues: ValidationIssue[] = [];
  const seenContexts = new Set<string>();
  rows.forEach((rawRow, index) => {
    const parsed = strategyAdminRowSchema.safeParse(rawRow);
    if (!parsed.success) {
      issues.push({ code: 'ROW_INVALID', path: `rows[${index}]`, severity: 'ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid strategy row' });
      return;
    }
    const row = normalizedRow(parsed.data);
    if (seenContexts.has(row.contextKey)) {
      issues.push({ code: 'DUPLICATE_CONTEXT', path: `rows[${index}].contextKey`, severity: 'ERROR', message: 'Strategy context is duplicated' });
    }
    seenContexts.add(row.contextKey);
    const total = row.actions.reduce((sum, action) => sum + action.frequency, 0);
    if (Math.abs(total - 1) > 0.000001) {
      issues.push({ code: 'FREQUENCIES_NOT_NORMALIZED', path: `rows[${index}].actions`, severity: 'ERROR', message: 'Action frequencies must total 1 within 0.000001' });
    }
    row.actions.forEach((action, actionIndex) => {
      if (['fold', 'check', 'call', 'all-in'].includes(action.action.type) && action.action.amountBB !== undefined) {
        issues.push({ code: 'ACTION_AMOUNT_INVALID', path: `rows[${index}].actions[${actionIndex}].action.amountBB`, severity: 'ERROR', message: 'This action type cannot have an amount' });
      }
    });
  });

  if (rows.length === 0) issues.push({ code: 'DRAFT_EMPTY', path: 'rows', severity: 'ERROR', message: 'A draft must contain at least one strategy row' });
  if (metadata.tableSize < 2) issues.push({ code: 'CONTEXT_INCOMPATIBLE', path: 'tableSize', severity: 'ERROR', message: 'Table size must support at least two players' });

  const errorCount = issues.filter((issue) => issue.severity === 'ERROR').length;
  return { status: errorCount === 0 ? 'PASSED' : 'FAILED', validatedAt: now, validatedById, rowCount: rows.length, errorCount, warningCount: issues.filter((issue) => issue.severity === 'WARNING').length, issues };
}
