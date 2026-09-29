import type { AnalyticsFilters } from '../services/handAnalyticsApi';

export function filtersFromParams(params: URLSearchParams): AnalyticsFilters {
  return { from: params.get('from') || undefined, to: params.get('to') || undefined, format: params.get('format') || undefined };
}

export function paramsFromFilters(filters: AnalyticsFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
  return params;
}