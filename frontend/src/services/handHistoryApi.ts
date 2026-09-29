import { apiClient } from './apiClient';

export interface HandHistorySummary {
  id: string;
  sourceType: string;
  format: string;
  status: string;
  startedAt: string;
  endedAt: string;
  summary: { board: unknown[]; pot: number | null; result: string | null; participantCount: number };
}

export interface HandHistoryListResponse {
  items: HandHistorySummary[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
}

export interface HandHistoryDetail {
  hand: HandHistorySummary & {
    board: unknown[];
    participants: { seatNumber: number; displayName: string; isViewer: boolean }[];
    actions: { sequence: number; street: string; seatNumber: number | null; type: string; amount: number | null }[];
    pots: unknown[];
    revealedCards: unknown[];
    limitations: unknown[];
  };
}

export type ReplayLimitation = { code: string; message: string; fromSequence?: number | null; toSequence?: number | null };
export type ReplayEvent = { sequence: number; street: string; seatNumber: number | null; actionType: string; amount: number | null; occurredAt: string; stateAfter: Record<string, unknown> | null; limitation?: ReplayLimitation };
export type HandReplay = {
  historyId: string;
  sourceType: string;
  format: string;
  status: string;
  sequenceVersion: number;
  initialState: Record<string, unknown>;
  events: ReplayEvent[];
  terminalState: Record<string, unknown> | null;
  limitations: ReplayLimitation[];
};

export type HandHistoryFilters = { page?: number; pageSize?: number; from?: string; to?: string; format?: string; result?: string; participant?: string; direction?: 'asc' | 'desc' };

export const handHistoryApi = {
  list(filters: HandHistoryFilters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
    return apiClient.get<HandHistoryListResponse>(`/api/hand-history${params.size ? `?${params.toString()}` : ''}`);
  },
  detail(historyId: string) { return apiClient.get<HandHistoryDetail>(`/api/hand-history/${encodeURIComponent(historyId)}`); },
  replay(historyId: string) { return apiClient.get<{ replay: HandReplay }>(`/api/hand-history/${encodeURIComponent(historyId)}/replay`); },
  remove(historyId: string) { return apiClient.delete<{ result: { historyId: string; status: string; visibleInMyHistory: boolean } }>(`/api/hand-history/${encodeURIComponent(historyId)}`); }
};