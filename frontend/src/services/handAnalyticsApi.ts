import { apiClient } from './apiClient';

export type AnalyticsFilters = { from?: string; to?: string; format?: string; relatedLimit?: number };
export type MetricValue = { value: number | null; numerator: number; denominator: number; sampleThreshold: number; isSufficient: boolean };
export type AnalyticsLimitation = { code: string; message: string; metric?: string; position?: string; street?: string };
export type DecisionMetrics = { scope: string; vpip: MetricValue; pfr: MetricValue; threeBet: MetricValue; winRate: MetricValue };
export type AnalyticsResponse = {
  analytics: {
    filters: AnalyticsFilters & { eligibleHands: number };
    summary: { handsPlayed: number; netResult: number | null; evResult: number | null; winRate: MetricValue; roi: MetricValue | null; netResultAvailable: boolean; evAvailable: boolean };
    trend: { periodStart: string; periodEnd: string; hands: number; netResult: number | null; evResult: number | null }[];
    overall: DecisionMetrics;
    byPosition: { key: string; hands: number; metrics: DecisionMetrics; limitations: AnalyticsLimitation[] }[];
    byStreet: { key: string; hands: number; metrics: DecisionMetrics; limitations: AnalyticsLimitation[] }[];
    relatedHands: { historyId: string; endedAt: string; format: string; status: string; contribution: string[]; canOpenDetail: boolean; canOpenReplay: boolean }[];
    limitations: AnalyticsLimitation[];
  };
};

export const handAnalyticsApi = {
  get(filters: AnalyticsFilters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
    return apiClient.get<AnalyticsResponse>(`/api/hand-history/analytics${params.size ? `?${params.toString()}` : ''}`);
  }
};