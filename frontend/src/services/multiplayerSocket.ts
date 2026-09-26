import { io, type Socket } from 'socket.io-client';
import type { TableActionInput, TableResponse } from './multiplayerApi';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

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

export function sendTableAction(socket: Socket, roomId: string, input: TableActionInput) {
  socket.emit('table:action', { roomId, ...input });
}
