import { Prisma, RoomInvitationStatus, RoomStatus, RoomVisibility } from '@prisma/client';
import { prisma } from '../../db/prisma/client.js';
import { isUserOnline } from '../auth/session-presence.js';
import { friendsRepository } from '../friends/friends.repository.js';
import { ApiError } from '../../shared/errors.js';
import type { CreateRoomInput, InvitationInput, JoinRoomInput, ReadinessInput } from './rooms.validation.js';
import type { InvitationView, RoomView } from './rooms.types.js';

const STALE_MEMBER_MS = 15 * 60 * 1000;
const roomInclude = {
  host: { select: { id: true, username: true } },
  members: { orderBy: { joinedAt: 'asc' as const }, include: { user: { select: { id: true, username: true } } } },
  invitations: { include: { fromUser: { select: { id: true, username: true } }, toUser: { select: { id: true, username: true } } } }
} as const;
type RoomWithDetails = Prisma.PokerRoomGetPayload<{ include: typeof roomInclude }>;
type InvitationWithDetails = Prisma.RoomInvitationGetPayload<{
  include: {
    fromUser: { select: { id: true; username: true } };
    toUser: { select: { id: true; username: true } };
    room: { select: { name: true } };
  };
}>;
type RoomTransaction = Prisma.TransactionClient;

const uniqueErrorCode = 'P2002';
function isUniqueError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === uniqueErrorCode;
}

function roomError(status: number, code: ConstructorParameters<typeof ApiError>[1], message: string): never {
  throw new ApiError(status, code, message);
}

function toRoomView(room: RoomWithDetails, includeMembers: boolean): RoomView {
  const members = includeMembers
    ? room.members.map((member) => ({
        userId: member.userId,
        username: member.user.username,
        seatNumber: member.seatNumber,
        ready: member.ready,
        isHost: member.userId === room.hostId,
        lastSeenAt: member.lastSeenAt.toISOString()
      }))
    : undefined;

  return {
    id: room.id,
    name: room.name,
    visibility: room.visibility,
    status: room.status,
    hostId: room.hostId,
    hostUsername: room.host.username,
    seatLimit: room.seatLimit,
    minPlayers: room.minPlayers,
    startingStackBB: room.startingStackBB,
    smallBlind: room.smallBlind,
    bigBlind: room.bigBlind,
    occupiedSeats: room.members.length,
    availableSeats: room.seatLimit - room.members.length,
    createdAt: room.createdAt.toISOString(),
    startedAt: room.startedAt?.toISOString(),
    closedAt: room.closedAt?.toISOString(),
    ...(members ? { members } : {})
  };
}

function toInvitationView(invitation: InvitationWithDetails): InvitationView {
  return {
    id: invitation.id,
    roomId: invitation.roomId,
    roomName: invitation.room.name,
    fromUserId: invitation.fromUserId,
    fromUsername: invitation.fromUser.username,
    toUserId: invitation.toUserId,
    status: invitation.status,
    createdAt: invitation.createdAt.toISOString()
  };
}

async function findRoom(roomId: string, tx: RoomTransaction | typeof prisma = prisma) {
  const room = await tx.pokerRoom.findUnique({ where: { id: roomId }, include: roomInclude });
  if (!room) roomError(404, 'ROOM_NOT_FOUND', 'No such room');
  return room;
}

function assertWaiting(room: { status: RoomStatus }) {
  if (room.status === RoomStatus.STARTED) roomError(409, 'ROOM_STARTED', 'This room has already started');
  if (room.status === RoomStatus.CLOSED) roomError(409, 'ROOM_CLOSED', 'This room is closed');
}

async function assertMember(roomId: string, userId: string, tx: RoomTransaction | typeof prisma = prisma) {
  const member = await tx.roomMember.findUnique({ where: { userId }, include: { user: { select: { id: true, username: true } } } });
  if (!member || member.roomId !== roomId) roomError(403, 'NOT_ROOM_MEMBER', 'You are not a member of this room');
  return member;
}

async function assertHost(room: { hostId: string }, userId: string) {
  if (room.hostId !== userId) roomError(403, 'NOT_ROOM_HOST', 'Only the room host can perform this action');
}

export const roomsService = {
  async createRoom(input: CreateRoomInput, userId: string) {
    const existing = await prisma.roomMember.findUnique({ where: { userId } });
    if (existing) roomError(409, 'ACTIVE_ROOM_EXISTS', 'You already belong to an active room');

    try {
      const room = await prisma.$transaction(async (tx) => {
        const created = await tx.pokerRoom.create({ data: { ...input, status: RoomStatus.WAITING, hostId: userId } });
        await tx.roomMember.create({ data: { roomId: created.id, userId, seatNumber: 1 } });
        return tx.pokerRoom.findUniqueOrThrow({ where: { id: created.id }, include: roomInclude });
      });
      return toRoomView(room, true);
    } catch (error) {
      if (isUniqueError(error)) roomError(409, 'ACTIVE_ROOM_EXISTS', 'You already belong to an active room');
      throw error;
    }
  },

  async listPublicRooms() {
    const rooms = await prisma.pokerRoom.findMany({ where: { status: RoomStatus.WAITING, visibility: RoomVisibility.PUBLIC }, include: roomInclude, orderBy: { createdAt: 'asc' } });
    return rooms.map((room) => toRoomView(room, false));
  },

  async getRoomForViewer(roomId: string, userId: string) {
    const room = await findRoom(roomId);
    const member = room.members.some((item) => item.userId === userId);
    const invitee = room.invitations.some((item) => item.toUserId === userId && item.status === RoomInvitationStatus.PENDING);
    if (room.visibility === RoomVisibility.PRIVATE && !member && room.hostId !== userId && !invitee) {
      roomError(404, 'ROOM_NOT_FOUND', 'No such room');
    }
    if (member || room.hostId === userId || invitee) {
      await prisma.roomMember.updateMany({ where: { roomId, userId }, data: { lastSeenAt: new Date() } });
      return toRoomView(room, true);
    }
    return toRoomView(room, false);
  },

  async joinRoom(roomId: string, input: JoinRoomInput, userId: string) {
    const room = await findRoom(roomId);
    assertWaiting(room);
    if (room.members.some((member) => member.userId === userId)) roomError(409, 'ALREADY_ROOM_MEMBER', 'You are already a member of this room');
    const existingMembership = await prisma.roomMember.findUnique({ where: { userId } });
    if (existingMembership) roomError(409, 'ACTIVE_ROOM_EXISTS', 'You already belong to an active room');

    const invitation = input.invitationId
      ? await prisma.roomInvitation.findFirst({ where: { id: input.invitationId, roomId, toUserId: userId, status: RoomInvitationStatus.PENDING } })
      : null;
    if (room.visibility === RoomVisibility.PRIVATE && !invitation) roomError(404, 'ROOM_NOT_FOUND', 'No such room');
    if (input.invitationId && !invitation) roomError(404, 'INVITATION_NOT_FOUND', 'No such invitation');

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.pokerRoom.findUniqueOrThrow({ where: { id: roomId }, include: roomInclude });
        assertWaiting(current);
        if (current.members.length >= current.seatLimit) roomError(409, 'ROOM_FULL', 'This room has no available seats');
        const usedSeats = new Set(current.members.map((member) => member.seatNumber));
        const seatNumber = Array.from({ length: current.seatLimit }, (_, index) => index + 1).find((seat) => !usedSeats.has(seat));
        if (!seatNumber) roomError(409, 'ROOM_FULL', 'This room has no available seats');
        await tx.roomMember.create({ data: { roomId, userId, seatNumber } });
        if (invitation) await tx.roomInvitation.update({ where: { id: invitation.id }, data: { status: RoomInvitationStatus.ACCEPTED } });
        return tx.pokerRoom.findUniqueOrThrow({ where: { id: roomId }, include: roomInclude });
      });
      return toRoomView(updated, true);
    } catch (error) {
      if (isUniqueError(error)) {
        const current = await prisma.pokerRoom.findUnique({ where: { id: roomId }, include: roomInclude });
        if (current && current.members.length >= current.seatLimit) roomError(409, 'ROOM_FULL', 'This room has no available seats');
        roomError(409, 'ACTIVE_ROOM_EXISTS', 'You already belong to an active room');
      }
      throw error;
    }
  },

  async leaveRoom(roomId: string, userId: string) {
    const room = await findRoom(roomId);
    assertWaiting(room);
    const member = await assertMember(roomId, userId);
    await prisma.$transaction(async (tx) => {
      await tx.roomMember.delete({ where: { id: member.id } });
      const remaining = await tx.roomMember.findMany({ where: { roomId }, orderBy: { joinedAt: 'asc' } });
      if (remaining.length === 0) {
        await tx.pokerRoom.update({ where: { id: roomId }, data: { status: RoomStatus.CLOSED, closedAt: new Date() } });
        await tx.roomInvitation.updateMany({ where: { roomId, status: RoomInvitationStatus.PENDING }, data: { status: RoomInvitationStatus.INVALIDATED } });
      } else if (room.hostId === userId) {
        await tx.pokerRoom.update({ where: { id: roomId }, data: { hostId: remaining[0].userId } });
      }
    });
  },

  async setReadiness(roomId: string, input: ReadinessInput, userId: string) {
    const room = await findRoom(roomId);
    assertWaiting(room);
    await assertMember(roomId, userId);
    await prisma.roomMember.update({ where: { userId }, data: { ready: input.ready, lastSeenAt: new Date() } });
    return this.getRoomForViewer(roomId, userId);
  },

  async createInvitation(roomId: string, input: InvitationInput, userId: string) {
    const room = await findRoom(roomId);
    assertWaiting(room);
    await assertHost(room, userId);
    if (input.userId === userId) roomError(400, 'VALIDATION_ERROR', 'You cannot invite yourself');
    const target = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!target) roomError(404, 'USER_NOT_FOUND', 'No such user');
    const friendship = await friendsRepository.findAcceptedByPair(userId, input.userId);
    if (!friendship) roomError(409, 'MUST_BE_FRIEND', 'You can only invite an accepted friend');
    const existing = await prisma.roomInvitation.findUnique({ where: { roomId_toUserId: { roomId, toUserId: input.userId } } });
    if (existing && existing.status === RoomInvitationStatus.PENDING) roomError(409, 'INVITATION_EXISTS', 'An invitation already exists');
    if (await prisma.roomMember.findUnique({ where: { userId: input.userId } })) roomError(409, 'ACTIVE_ROOM_EXISTS', 'That user already belongs to an active room');
    try {
      const invitation = await prisma.roomInvitation.create({ data: { roomId, fromUserId: userId, toUserId: input.userId } , include: { fromUser: { select: { id: true, username: true } }, toUser: { select: { id: true, username: true } }, room: { select: { name: true } } } });
      return toInvitationView(invitation);
    } catch (error) {
      if (isUniqueError(error)) roomError(409, 'INVITATION_EXISTS', 'An invitation already exists');
      throw error;
    }
  },

  async listInvitations(userId: string) {
    const invitations = await prisma.roomInvitation.findMany({ where: { toUserId: userId, status: RoomInvitationStatus.PENDING }, include: { fromUser: { select: { id: true, username: true } }, toUser: { select: { id: true, username: true } }, room: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
    return invitations.map((invitation) => toInvitationView(invitation));
  },

  async acceptInvitation(invitationId: string, userId: string) {
    const invitation = await prisma.roomInvitation.findUnique({ where: { id: invitationId }, include: { room: { include: roomInclude } } });
    if (!invitation) roomError(404, 'INVITATION_NOT_FOUND', 'No such pending invitation');
    if (invitation.toUserId !== userId) roomError(403, 'NOT_INVITATION_RECIPIENT', 'Only the recipient can accept this invitation');
    if (invitation.status !== RoomInvitationStatus.PENDING) roomError(404, 'INVITATION_NOT_FOUND', 'No such pending invitation');
    return this.joinRoom(invitation.roomId, { invitationId }, userId);
  },

  async declineInvitation(invitationId: string, userId: string) {
    const invitation = await prisma.roomInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation) roomError(404, 'INVITATION_NOT_FOUND', 'No such invitation');
    if (invitation.toUserId !== userId) roomError(403, 'NOT_INVITATION_RECIPIENT', 'Only the recipient can decline this invitation');
    if (invitation.status === RoomInvitationStatus.PENDING) await prisma.roomInvitation.update({ where: { id: invitationId }, data: { status: RoomInvitationStatus.DECLINED } });
  },

  async startRoom(roomId: string, userId: string) {
    const room = await findRoom(roomId);
    assertWaiting(room);
    await assertHost(room, userId);
    if (room.members.length < room.minPlayers) roomError(409, 'NOT_ENOUGH_PLAYERS', 'The room does not have enough players');
    if (room.members.some((member) => !member.ready)) roomError(409, 'MEMBERS_NOT_READY', 'Every member must be ready');
    const started = await prisma.$transaction(async (tx) => {
      const updated = await tx.pokerRoom.update({ where: { id: roomId, status: RoomStatus.WAITING }, data: { status: RoomStatus.STARTED, startedAt: new Date() }, include: roomInclude });
      await tx.roomInvitation.updateMany({ where: { roomId, status: RoomInvitationStatus.PENDING }, data: { status: RoomInvitationStatus.INVALIDATED } });
      return updated;
    });
    return toRoomView(started, true);
  },

  async closeRoom(roomId: string, userId: string) {
    const room = await findRoom(roomId);
    if (room.status === RoomStatus.STARTED) roomError(409, 'ROOM_STARTED', 'A started room cannot be closed');
    if (room.status === RoomStatus.CLOSED) roomError(409, 'ROOM_CLOSED', 'This room is already closed');
    await assertHost(room, userId);
    await prisma.$transaction([
      prisma.pokerRoom.update({ where: { id: roomId }, data: { status: RoomStatus.CLOSED, closedAt: new Date() } }),
      prisma.roomInvitation.updateMany({ where: { roomId, status: RoomInvitationStatus.PENDING }, data: { status: RoomInvitationStatus.INVALIDATED } })
    ]);
  },

  async cleanupStaleWaitingMembers() {
    const cutoff = new Date(Date.now() - STALE_MEMBER_MS);
    const rooms = await prisma.pokerRoom.findMany({ where: { status: RoomStatus.WAITING }, include: { members: true } });
    let released = 0;
    for (const room of rooms) {
      for (const member of room.members) {
        if (member.lastSeenAt < cutoff && !(await isUserOnline(member.userId))) {
          await this.leaveRoom(room.id, member.userId);
          released += 1;
        }
      }
    }
    return released;
  }
};
