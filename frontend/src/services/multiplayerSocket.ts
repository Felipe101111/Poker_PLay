import { io, type Socket } from 'socket.io-client';
import type { TableActionInput, TableResponse } from './multiplayerApi';
import type { TrainingDecision } from './multiplayerTrainingApi';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL must be configured for production builds');
}

export interface TableSnapshotEvent {
  roomId: string;
  stateVersion: number;
  table: TableResponse['table'];
}

export interface TableStateChangedEvent extends TableSnapshotEvent {
  cause: string;
}

export interface TableErrorEvent {
  code: string;
  message: string;
  stateVersion?: number;
}

export interface TablePresenceEvent {
  roomId: string;
  stateVersion: number;
  userId: string;
  seatNumber: number;
  status: 'ONLINE' | 'DISCONNECTED';
}

export interface TrainingJoinedEvent {
  roomId: string;
  trainingSessionId: string;
  participantStatus: string;
}

export interface TrainingDecisionEvent {
  roomId: string;
  trainingSessionId: string;
  decision: TrainingDecision;
}

export function createMultiplayerSocket() {
  return io(SOCKET_URL, { withCredentials: true, autoConnect: false });
}

export function joinTable(socket: Socket, roomId: string, lastSeenVersion: number) {
  socket.connect();
  socket.emit('table:join', { roomId, lastSeenVersion });
}

export function leaveTable(socket: Socket, roomId: string) {
  socket.emit('table:leave', { roomId });
}

export function sendTableHeartbeat(socket: Socket, roomId: string) {
  socket.emit('table:heartbeat', { roomId });
}

export function sendTableAction(socket: Socket, roomId: string, input: TableActionInput, acknowledge?: (response: { ok: boolean; code?: string; message?: string }) => void) {
  socket.emit('table:action', { roomId, ...input }, acknowledge);
}

export function joinTraining(socket: Socket, roomId: string) {
  socket.emit('training:join', { roomId });
}

export function leaveTraining(socket: Socket, roomId: string) {
  socket.emit('training:leave', { roomId });
}
