import { apiClient } from './apiClient';

export type EditorialRole = 'USER' | 'EDITOR' | 'REVIEWER' | 'PUBLISHER' | 'ADMIN';
export type StrategyStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED';
export interface StrategyRow { contextKey: string; range: unknown | null; actions: Array<{ action: { type: string; amountBB?: number }; frequency: number }>; factors: string[]; assumptions: string[]; conditions: string[] }
export interface StrategyVersion { id: string; datasetId: string; version: string; status: StrategyStatus; revision: number; metadata: Record<string, unknown>; rows: StrategyRow[]; validationReport: unknown }
export interface StrategyDataset { id: string; key: string; name: string; description: string | null; activeVersions: Array<{ id: string; version: string; compatibilityKey: string; publishedAt: string | null }> }

export const strategyAdministrationApi = {
  listDatasets: () => apiClient.get<{ datasets: StrategyDataset[] }>('/api/strategy/admin/datasets'),
  createDataset: (input: { key: string; name: string; description?: string }) => apiClient.post<StrategyDataset>('/api/strategy/admin/datasets', input),
  createDraft: (datasetId: string, input: Record<string, unknown>) => apiClient.post<StrategyVersion>(`/api/strategy/admin/datasets/${datasetId}/versions`, input),
  getVersion: (versionId: string) => apiClient.get<StrategyVersion>(`/api/strategy/admin/versions/${versionId}`),
  updateDraft: (versionId: string, input: { expectedRevision: number; metadata?: Record<string, unknown>; rows?: StrategyRow[] }) => apiClient.put<StrategyVersion>(`/api/strategy/admin/versions/${versionId}`, input),
  validate: (versionId: string) => apiClient.post<unknown>(`/api/strategy/admin/versions/${versionId}/validate`),
  publish: (versionId: string, expectedRevision: number) => apiClient.post<StrategyVersion>(`/api/strategy/admin/versions/${versionId}/publish`, { expectedRevision })
};
