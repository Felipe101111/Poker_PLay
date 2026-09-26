import { Prisma, RoomStatus } from '@prisma/client';
import { prisma } from '../../db/prisma/client.js';
import { startHand } from '../../poker-engine/engine.js';
import type { HandState } from '../../poker-engine/types.js';

export type DbClient = typeof prisma | Prisma.TransactionClient;

export const tableInclude = {
  room: { include: { members: { include: { user: { select: { id: true, username: true } } }, orderBy: { seatNumber: 'asc' as const } } } },
  participants: { include: { user: { select: { id: true, username: true } } }, orderBy: { seatNumber: 'asc' as const } },
  currentHand: true
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
