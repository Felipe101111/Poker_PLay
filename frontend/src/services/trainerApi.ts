import { apiClient } from './apiClient';

export type TrainerAction = { type: string; amountBB?: number };
export type TrainerScenario = {
  id: string; sequence: number; tableSize: number; position: string; effectiveStackBB: number;
  holeCards: Array<{ rank: string; suit: string }>;
  blindContext: { smallBlind: number; bigBlind: number };
  priorActions: unknown[];
  legalActions: { actions: string[]; callAmountBB: number | null; minBetOrRaiseBB: number | null; maxBetOrRaiseBB: number | null };
  strategyAvailable: boolean; strategyVersion: string | null;
};
export type TrainerDecision = { id: string; scenarioId: string; selectedAction: TrainerAction; evaluationStatus: string; category: string | null; recommendations: Array<{ action: TrainerAction; frequency: number }> | null; explanation: { factors: string[]; assumptions: string[] } };
export type TrainerResponse = { session: { id: string; status: string; format: string }; scenario: TrainerScenario | null; latestDecision: TrainerDecision | null };

export const trainerApi = {
  start: () => apiClient.post<TrainerResponse>('/api/trainer/session/start', {}),
  current: () => apiClient.get<TrainerResponse>('/api/trainer/session'),
  decide: (scenarioId: string, requestId: string, action: TrainerAction) => apiClient.post<{ decision: TrainerDecision; duplicate: boolean }>('/api/trainer/session/decisions', { scenarioId, requestId, action }),
  next: (decisionId: string, requestId: string) => apiClient.post<{ decision: TrainerDecision } & TrainerResponse>('/api/trainer/session/next', { decisionId, requestId }),
  progress: () => apiClient.get<{ progress: { completedDecisions: number; preferred: number; acceptableMixed: number; marginal: number; significantDeviation: number; unavailable: number; byAction: Record<string, number>; empty: boolean } }>('/api/trainer/progress')
};
