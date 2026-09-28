import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { StrategyDatasetVersion, StrategyLookupRequest, StrategyLookupResult, StrategyRow } from './strategy.types.js';
import { validateStrategyLookup, validateStrategyRow, validateStrategyVersion } from './strategy.validation.js';
import type { StrategyRepository } from './strategy.repository.js';

export class StrategyService {
  constructor(private readonly repository: StrategyRepository) {}

  loadManifest(manifestFile = fileURLToPath(new URL('./data/preflop-v1.manifest.json', import.meta.url))): StrategyDatasetVersion {
    return validateStrategyVersion(JSON.parse(readFileSync(manifestFile, 'utf8')));
  }

  loadPostflopManifest(): StrategyDatasetVersion {
    return this.loadManifest(fileURLToPath(new URL('./data/postflop-v1.manifest.json', import.meta.url)));
  }

  postflopContextKey(input: { street: 'flop' | 'turn' | 'river'; position: string; effectiveStackBB: number; priorActions: unknown[] }): string {
    const actionState = input.priorActions.length === 0 ? 'checked-to-hero' : 'after-action';
    return `${input.street}:SIX_MAX_100BB_POSTFLOP:${input.position}:${input.effectiveStackBB}bb:${actionState}`;
  }

  publish(versionInput: unknown, rowInputs: unknown[]): StrategyDatasetVersion {
    const version = validateStrategyVersion(versionInput);
    const rows = rowInputs.map(validateStrategyRow);
    const contentHash = createHash('sha256').update(JSON.stringify({ version, rows })).digest('hex');
    const published = { ...version, contentHash, status: 'PUBLISHED' as const };
    this.repository.publish(published, rows);
    return published;
  }

  lookup(input: unknown): StrategyLookupResult {
    const request: StrategyLookupRequest = validateStrategyLookup(input);
    const dataset = this.repository.getVersion(request.datasetVersion);
    if (!dataset) return { availability: 'UNAVAILABLE', datasetVersion: request.datasetVersion, contextKey: request.contextKey, reason: 'STRATEGY_VERSION_NOT_FOUND' };
    const row = this.repository.getRow(dataset.version, request.contextKey);
    if (!row || row.contextKey !== request.contextKey || dataset.gameFormat !== request.gameFormat || dataset.street !== request.street) {
      return { availability: 'UNAVAILABLE', datasetVersion: request.datasetVersion, contextKey: request.contextKey, reason: 'NO_COMPATIBLE_STRATEGY_ROW' };
    }
    return { availability: 'AVAILABLE', dataset: { ...dataset }, row: { ...row, actions: row.actions.map((action) => ({ ...action, action: { ...action.action } })) } };
  }

  retire(version: string, retiredAt = new Date().toISOString()): void { this.repository.retire(version, retiredAt); }
}
