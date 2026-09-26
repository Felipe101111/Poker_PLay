import type { ParticipantConnectionStatus, MultiplayerTableStatus, MultiplayerHandStatus } from '@prisma/client';
import type { ActionType, Card, LegalActions } from '../../poker-engine/types.js';

export type { ParticipantConnectionStatus, MultiplayerTableStatus, MultiplayerHandStatus };

export interface TablePlayerView {
  userId: string;
  username: string;
  seatNumber: number;
  stack: number;
  connectionStatus: ParticipantConnectionStatus;
  folded: boolean;
  isAllIn: boolean;
  eliminated: boolean;
  streetContribution: number;
  totalContribution: number;
  holeCards: Card[] | null;
}

export interface CurrentHandView {
  id: string;
  status: MultiplayerHandStatus;
  street: string;
  board: Card[];
  pot: number;
  actingSeat: number | null;
  legalActions: LegalActions | null;
  privateCards: Card[];
  players: TablePlayerView[];
}

export interface TableView {
  id: string;
  roomId: string;
  status: MultiplayerTableStatus;
  handNumber: number;
  stateVersion: number;
  dealerSeat: number;
  currentHand: CurrentHandView | null;
}

export interface TableSnapshotEvent {
  roomId: string;
  stateVersion: number;
  table: TableView;
}

export type TableStateChangeCause =
  | 'HAND_STARTED'
  | 'ACTION_ACCEPTED'
  | 'STREET_ADVANCED'
  | 'HAND_COMPLETED'
  | 'PLAYER_ELIMINATED'
  | 'PLAYER_AUTO_FOLDED'
  | 'TABLE_CLOSED';

export interface TableStateChangedEvent extends TableSnapshotEvent {
  cause: TableStateChangeCause;
}

export interface TablePresenceChangedEvent {
  roomId: string;
  stateVersion: number;
  userId: string;
  seatNumber: number;
  status: ParticipantConnectionStatus;
}

export interface TableErrorEvent {
  code: string;
  message: string;
  stateVersion?: number;
}

export interface MultiplayerAction {
  seatNumber: number;
  type: ActionType;
  amount: number | null;
}
