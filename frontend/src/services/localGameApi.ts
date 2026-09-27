import { apiClient } from './apiClient';

export interface CardView {
  rank: string;
  suit: string;
}

export interface SeatView {
  seatNumber: number;
  stack: number;
  holeCards: [CardView, CardView] | null;
  folded: boolean;
  isAllIn: boolean;
}

export interface PotView {
  amount: number;
  eligibleSeats: number[];
  winners: number[] | null;
}

export interface HandResultView {
  potsAwarded: PotView[];
  revealedSeats: number[];
  handRanks: Record<string, number[]>;
}

export interface LegalActionsView {
  seatNumber: number;
  actions: string[];
  callAmount: number | null;
  minBetOrRaise: number | null;
  maxBetOrRaise: number | null;
}

export interface HandStateView {
  id: string;
  bettingRound: string;
  communityCards: CardView[];
  pots: PotView[];
  seatToAct: number | null;
  legalActions: LegalActionsView | null;
  seats: SeatView[];
  result: HandResultView | null;
}

export const localGameApi = {
  startHand: (seatCount: number, startingStackBB?: number) =>
    apiClient.post<HandStateView>('/api/local-games', { seatCount, startingStackBB }),
  getState: (asSeat: number) => apiClient.get<HandStateView>(`/api/local-games/current?asSeat=${asSeat}`),
  submitAction: (seatNumber: number, type: string, amount?: number) =>
    apiClient.post<HandStateView>('/api/local-games/current/actions', { seatNumber, type, amount }),
  abandon: () => apiClient.delete<void>('/api/local-games/current')
};
