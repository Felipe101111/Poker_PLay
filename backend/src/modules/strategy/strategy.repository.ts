import type { StrategyDatasetVersion, StrategyRow } from './strategy.types.js';

export interface StrategyRepository {
  getVersion(version: string): StrategyDatasetVersion | undefined;
  getRow(datasetVersionId: string, contextKey: string): StrategyRow | undefined;
  publish(version: StrategyDatasetVersion, rows: StrategyRow[]): void;
  retire(version: string, retiredAt: string): void;
}

export class InMemoryStrategyRepository implements StrategyRepository {
  private readonly versions = new Map<string, StrategyDatasetVersion>();
  private readonly rows = new Map<string, StrategyRow>();

  getVersion(version: string): StrategyDatasetVersion | undefined { return this.versions.get(version); }
  getRow(datasetVersionId: string, contextKey: string): StrategyRow | undefined { return this.rows.get(`${datasetVersionId}:${contextKey}`); }
  publish(version: StrategyDatasetVersion, rows: StrategyRow[]): void {
    if (this.versions.has(version.version)) throw new Error(`Strategy version already exists: ${version.version}`);
    const immutableVersion = Object.freeze({ ...version, status: 'PUBLISHED' as const });
    this.versions.set(version.version, immutableVersion);
    for (const row of rows) this.rows.set(`${version.version}:${row.contextKey}`, Object.freeze({ ...row, actions: row.actions.map((action) => Object.freeze({ ...action, action: Object.freeze({ ...action.action }) })) }));
  }
  retire(version: string, retiredAt: string): void {
    const existing = this.versions.get(version);
    if (!existing) return;
    this.versions.set(version, Object.freeze({ ...existing, status: 'RETIRED' as const, retiredAt }));
  }
}
