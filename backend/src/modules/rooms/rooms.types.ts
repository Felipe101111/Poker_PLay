import type { RoomInvitationStatus, RoomStatus, RoomVisibility } from '@prisma/client';

export type { RoomInvitationStatus, RoomStatus, RoomVisibility };

export interface RoomViewMember {
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
  members?: RoomViewMember[];
}

export interface InvitationView {
  id: string;
  roomId: string;
  roomName: string;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  status: RoomInvitationStatus;
  createdAt: string;
}
