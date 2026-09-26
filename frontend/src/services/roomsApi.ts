import { apiClient } from './apiClient';

export type RoomVisibility = 'PUBLIC' | 'PRIVATE';
export type RoomStatus = 'WAITING' | 'STARTED' | 'CLOSED';

export interface RoomMember {
  userId: string;
  username: string;
  seatNumber: number;
  ready: boolean;
  isHost: boolean;
  lastSeenAt?: string;
}

export interface RoomView {
  id: string;
  name: string;
  visibility: RoomVisibility;
  status: RoomStatus;
  hostId: string;
  hostUsername: string;
  seatLimit: number;
  minPlayers: number;
  startingStackBB: number;
  smallBlind: number;
  bigBlind: number;
  occupiedSeats: number;
  availableSeats: number;
  createdAt: string;
  startedAt?: string;
  closedAt?: string;
  members?: RoomMember[];
}

export interface RoomInvitation {
  id: string;
  roomId: string;
  roomName: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  status: string;
  createdAt: string;
}

export interface CreateRoomInput {
  name: string;
  visibility: RoomVisibility;
  seatLimit: number;
  minPlayers: number;
  startingStackBB: number;
  smallBlind: number;
  bigBlind: number;
}

export const roomsApi = {
  list: () => apiClient.get<{ rooms: RoomView[] }>('/api/rooms'),
  current: () => apiClient.get<{ room: RoomView | null }>('/api/rooms/current'),
  get: (roomId: string) => apiClient.get<RoomView>(`/api/rooms/${roomId}`),
  create: (input: CreateRoomInput) => apiClient.post<RoomView>('/api/rooms', input),
  join: (roomId: string, invitationId?: string) => apiClient.post<RoomView>(`/api/rooms/${roomId}/join`, invitationId ? { invitationId } : {}),
  leave: (roomId: string) => apiClient.post<void>(`/api/rooms/${roomId}/leave`),
  setReadiness: (roomId: string, ready: boolean) => apiClient.patch<RoomView>(`/api/rooms/${roomId}/readiness`, { ready }),
  start: (roomId: string) => apiClient.post<RoomView>(`/api/rooms/${roomId}/start`),
  close: (roomId: string) => apiClient.delete<void>(`/api/rooms/${roomId}`),
  invite: (roomId: string, userId: string) => apiClient.post<RoomInvitation>(`/api/rooms/${roomId}/invitations`, { userId }),
  listInvitations: () => apiClient.get<{ invitations: RoomInvitation[] }>('/api/rooms/invitations'),
  acceptInvitation: (invitationId: string) => apiClient.post<RoomView>(`/api/rooms/invitations/${invitationId}/accept`),
  declineInvitation: (invitationId: string) => apiClient.post<void>(`/api/rooms/invitations/${invitationId}/decline`)
};
