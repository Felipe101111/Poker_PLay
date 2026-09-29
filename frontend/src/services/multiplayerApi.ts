import { apiClient } from './apiClient';

export type TableStatus = 'ACTIVE' | 'CLOSED';
export type HandStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
export type ConnectionStatus = 'ONLINE' | 'DISCONNECTED' | 'ELIMINATED';
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface Card {
  rank: string;
  suit: string;
}

export interface TablePlayer {
  userId: string;
  username: string;
  seatNumber: number;
  stack: number;
  connectionStatus: ConnectionStatus;
  folded: boolean;
  isAllIn: boolean;
  eliminated: boolean;
  streetContribution: number;
  totalContribution: number;
  holeCards: Card[] | null;
}

export interface LegalActions {
  seatNumber: number;
  actions: ActionType[];
  callAmount: number | null;
  minBetOrRaise: number | null;
  maxBetOrRaise: number | null;
}

export interface CurrentHand {
  id: string;
  status: HandStatus;
  street: string;
  board: Card[];
  pot: number;
  actingSeat: number | null;
  legalActions: LegalActions | null;
  privateCards: Card[];
  result: HandResult | null;
  players: TablePlayer[];
}

export interface HandResult {
  potsAwarded: Array<{ amount: number; eligibleSeats: number[]; winners: number[] | null }>;
  revealedSeats: number[];
  handRanks: Record<string, number[]>;
}

export interface TableView {
  id: string;
  roomId: string;
  status: TableStatus;
  handNumber: number;
  stateVersion: number;
  dealerSeat: number;
  currentHand: CurrentHand | null;
  lastCompletedHand: { id: string; handNumber: number; board: Card[]; result: HandResult } | null;
}

export interface TableResponse {
  table: TableView;
}

export interface TableActionInput {
  handId: string;
  expectedVersion: number;
  requestId: string;
  type: ActionType;
  amount?: number;
}

export const multiplayerApi = {
  get: (roomId: string) => apiClient.get<TableResponse>(`/api/rooms/${roomId}/table`),
  reconnect: (roomId: string, lastSeenVersion: number) => apiClient.post<TableResponse>(`/api/rooms/${roomId}/table/reconnect`, { lastSeenVersion }),
  action: (roomId: string, input: TableActionInput) => apiClient.post<TableResponse>(`/api/rooms/${roomId}/table/actions`, input)
};
