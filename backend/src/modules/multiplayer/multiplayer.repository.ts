import { MultiplayerActionType, Prisma, RoomStatus } from '@prisma/client';
import { prisma } from '../../db/prisma/client.js';
import { startHand } from '../../poker-engine/engine.js';
import type { HandState } from '../../poker-engine/types.js';
import { DISCONNECT_GRACE_MS } from './multiplayer.presence.js';

export type DbClient = typeof prisma | Prisma.TransactionClient;

export const tableInclude = {
  room: { include: { members: { include: { user: { select: { id: true, username: true } } }, orderBy: { seatNumber: 'asc' as const } } } },
  participants: { include: { user: { select: { id: true, username: true } } }, orderBy: { seatNumber: 'asc' as const } },
  currentHand: true,
  hands: { where: { status: 'COMPLETED' as const }, orderBy: { handNumber: 'desc' as const }, take: 1 }
} as const;

export type TableWithDetails = Prisma.MultiplayerTableGetPayload<{ include: typeof tableInclude }>;

export async function findTableByRoom(roomId: string, db: DbClient = prisma): Promise<TableWithDetails | null> {
  return db.multiplayerTable.findUnique({ where: { roomId }, include: tableInclude });
}

export async function findTableForUser(roomId: string, userId: string, db: DbClient = prisma): Promise<TableWithDetails | null> {
  return db.multiplayerTable.findFirst({
    where: { roomId, participants: { some: { userId } } },
    include: tableInclude
  });
}

export async function createTableFromStartedRoom(roomId: string, db: DbClient = prisma): Promise<TableWithDetails> {
  const room = await db.pokerRoom.findUnique({
    where: { id: roomId },
    include: { members: { include: { user: { select: { id: true, username: true } } }, orderBy: { seatNumber: 'asc' } } }
  });
  if (!room || room.status !== RoomStatus.STARTED) throw new Error('ROOM_NOT_STARTED');

  const existing = await findTableByRoom(roomId, db);
  if (existing) return existing;

  const orderedMembers = [...room.members].sort((a, b) => a.seatNumber - b.seatNumber);
  const hand = startHand(room.hostId, orderedMembers.length, room.startingStackBB);
  const table = await db.multiplayerTable.create({
    data: {
      roomId,
      dealerSeat: orderedMembers[0].seatNumber,
      participants: {
        create: orderedMembers.map((member, index) => ({
          userId: member.userId,
          roomMemberId: member.id,
          seatNumber: member.seatNumber,
          stack: hand.seats[index].stack
        }))
      }
    }
  });
  const persistedHand = await db.multiplayerHand.create({
    data: {
      tableId: table.id,
      handNumber: 1,
      stateSnapshot: hand as unknown as Prisma.InputJsonValue,
      actingSeat: hand.seatToAct
    }
  });
  await db.multiplayerTable.update({ where: { id: table.id }, data: { currentHandId: persistedHand.id } });
  return (await findTableByRoom(roomId, db))!;
}

export function readHandState(snapshot: Prisma.JsonValue): HandState {
  return snapshot as unknown as HandState;
}

export async function markParticipantConnected(tableId: string, userId: string, now = new Date(), db: DbClient = prisma) {
  return db.tableParticipant.updateMany({
    where: { tableId, userId, eligibleForNextHand: true },
    data: { connectionStatus: 'ONLINE', lastSeenAt: now, disconnectedAt: null }
  });
}

export async function markParticipantDisconnected(tableId: string, userId: string, now = new Date(), db: DbClient = prisma) {
  return db.tableParticipant.updateMany({
    where: { tableId, userId, eligibleForNextHand: true },
    data: { connectionStatus: 'DISCONNECTED', lastSeenAt: now, disconnectedAt: now }
  });
}

export async function touchParticipant(tableId: string, userId: string, now = new Date(), db: DbClient = prisma) {
  return db.tableParticipant.updateMany({
    where: { tableId, userId, eligibleForNextHand: true },
    data: { connectionStatus: 'ONLINE', lastSeenAt: now, disconnectedAt: null }
  });
}

export async function findExpiredDisconnectedParticipants(now = new Date(), db: DbClient = prisma) {
  const cutoff = new Date(now.getTime() - DISCONNECT_GRACE_MS);
  return db.tableParticipant.findMany({
    where: { connectionStatus: 'DISCONNECTED', disconnectedAt: { lte: cutoff }, eligibleForNextHand: true },
    include: { table: { include: tableInclude } }
  });
}

export async function recordRejectedAction(input: {
  handId: string;
  requestId: string;
  userId: string;
  seatNumber: number;
  actionType: MultiplayerActionType;
  amount?: number | null;
  rejectionCode: string;
}, db: DbClient = prisma) {
  const rejectedCount = await db.tableAction.count({ where: { handId: input.handId, accepted: false } });
  return db.tableAction.create({
    data: {
      handId: input.handId,
      requestId: input.requestId,
      sequence: -1 - rejectedCount,
      userId: input.userId,
      seatNumber: input.seatNumber,
      actionType: input.actionType,
      amount: input.amount ?? null,
      accepted: false,
      rejectionCode: input.rejectionCode,
      resultingVersion: null
    }
  });
}
