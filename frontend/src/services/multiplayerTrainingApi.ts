import { apiClient } from './apiClient';
import type { TableView } from './multiplayerApi';

export type TrainingStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type ParticipantStatus = 'ENROLLED' | 'LEFT' | 'REMOVED';
export type EvaluationStatus = 'EVALUATED' | 'UNAVAILABLE';

export interface TrainingDecision {
  id: string;
  handId: string;
  street: string;
  selectedAction: { type: string; amount: number | null };
  evaluationStatus: EvaluationStatus;
  category: string | null;
  equity: unknown;
  strategy: unknown;
  explanation: { factors?: string[]; assumptions?: string[]; limitations?: string[] };
}

export interface TrainingResponse {
  training: {
    id: string;
    tableId: string;
    status: TrainingStatus;
    participant: { id: string; userId: string; seatNumber: number; status: ParticipantStatus; joinedAt: string; leftAt: string | null };
    decisions: TrainingDecision[];
  };
  table: TableView;
}

export interface TrainingDecisionListResponse {
  items: TrainingDecision[];
  page: number;
  pageSize: number;
  total: number;
}

export const multiplayerTrainingApi = {
  join: (roomId: string) => apiClient.post<TrainingResponse>(`/api/rooms/${roomId}/training`, { mode: 'CREATE_OR_JOIN' }),
  get: (roomId: string) => apiClient.get<TrainingResponse>(`/api/rooms/${roomId}/training`),
  decisions: (roomId: string, page = 1) => apiClient.get<TrainingDecisionListResponse>(`/api/rooms/${roomId}/training/decisions?page=${page}&pageSize=50`),
  leave: (roomId: string) => apiClient.post<{ training: { participantStatus: ParticipantStatus }; table: TableView }>(`/api/rooms/${roomId}/training/leave`, {})
};
