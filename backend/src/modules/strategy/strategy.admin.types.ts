import type { EditorialRole, StrategyDatasetStatus } from '@prisma/client';

export type { EditorialRole, StrategyDatasetStatus };

export const editorialRoleCapabilities = {
  USER: [],
  EDITOR: ['dataset:create', 'draft:read', 'draft:write'],
  REVIEWER: ['draft:read', 'draft:validate', 'history:read'],
  PUBLISHER: ['draft:read', 'version:publish', 'version:retire', 'history:read'],
  ADMIN: ['dataset:create', 'draft:read', 'draft:write', 'draft:validate', 'version:publish', 'version:retire', 'history:read', 'audit:read', 'role:write']
} as const satisfies Record<EditorialRole, readonly string[]>;

export interface StrategyActionInput {
  action: { type: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'; amountBB?: number };
  frequency: number;
}

export interface StrategyRowInput {
  contextKey: string;
  range?: unknown | null;
  actions: StrategyActionInput[];
  factors: string[];
  assumptions: string[];
  conditions: string[];
}

export interface StrategyVersionMetadataInput {
  version: string;
  schemaVersion: string;
  gameFormat: string;
  street: 'preflop' | 'flop' | 'turn' | 'river';
  tableSize: number;
  stackAssumptions: string[];
  blindAssumptions: string[];
  source: string;
  assumptions: string[];
  precision: number;
}

export interface StrategyDraftUpdateInput {
  expectedRevision: number;
  metadata?: Partial<StrategyVersionMetadataInput>;
  rows?: StrategyRowInput[];
}

export interface ValidationIssue {
  code: string;
  path: string;
  severity: 'ERROR' | 'WARNING';
  message: string;
  rowId?: string;
}

export interface ValidationReport {
  status: 'PASSED' | 'FAILED';
  validatedAt: string;
  validatedById: string;
  rowCount: number;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
}

export interface StrategyDatasetSummary {
  id: string;
  key: string;
  name: string;
  description: string | null;
  activeVersions: Array<{ id: string; version: string; compatibilityKey: string; publishedAt: string | null }>;
}

export interface StrategyAdminVersion {
  id: string;
  datasetId: string;
  version: string;
  status: StrategyDatasetStatus;
  revision: number;
  compatibilityKey: string;
  activeCompatibilityKey: string | null;
  metadata: StrategyVersionMetadataInput;
  contentHash: string | null;
  validationReport: ValidationReport | null;
  rows: StrategyRowInput[];
  createdById: string | null;
  publishedById: string | null;
  retiredById: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  retiredAt: string | null;
}
