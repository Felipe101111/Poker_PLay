import type { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma/client.js';
import { ApiError } from '../../shared/errors.js';
import { findTableForUser } from './multiplayer.repository.js';
import { computeLegalActions } from '../../poker-engine/betting.js';
import type { HandState } from '../../poker-engine/types.js';

type DbClient = typeof prisma | Prisma.TransactionClient;

export const trainingInclude = {
  participants: { include: { tableParticipant: true }, orderBy: { joinedAt: 'asc' as const } },
  decisions: { orderBy: { createdAt: 'desc' as const }, take: 50 }
} as const;

export type TrainingSessionWithDetails = Prisma.MultiplayerTrainingSessionGetPayload<{ include: typeof trainingInclude }>;

export async function findTrainingByRoomForUser(roomId: string, userId: string, db: DbClient = prisma) {
  return db.multiplayerTrainingSession.findFirst({
    where: { table: { roomId }, participants: { some: { userId, status: { in: ['ENROLLED', 'LEFT'] } } } },
    include: trainingInclude
  });
}

export async function findTrainingByRoom(roomId: string, db: DbClient = prisma) {
  return db.multiplayerTrainingSession.findFirst({ where: { table: { roomId } }, include: trainingInclude });
}

export async function findParticipantByRoomUser(roomId: string, userId: string, db: DbClient = prisma) {
  return db.multiplayerTrainingParticipant.findFirst({
    where: { userId, trainingSession: { table: { roomId } } },
    include: { trainingSession: { include: trainingInclude }, tableParticipant: true }
  });
}

export async function createOrJoinTraining(roomId: string, userId: string, db: DbClient = prisma) {
  const table = await findTableForUser(roomId, userId, db);
  if (!table) throw new ApiError(403, 'ROOM_ACCESS_DENIED', 'You are not a table participant');
  if (table.status === 'CLOSED') throw new ApiError(409, 'TABLE_CLOSED', 'This table is closed');
  if (table.room.status !== 'STARTED') throw new ApiError(404, 'ROOM_NOT_FOUND', 'Training requires a started room');

  const tableParticipant = table.participants.find((participant) => participant.userId === userId);
  if (!tableParticipant) throw new ApiError(403, 'ROOM_ACCESS_DENIED', 'You are not a table participant');

  try {
    return await prisma.$transaction(async (tx) => {
      let session = await tx.multiplayerTrainingSession.findUnique({ where: { tableId: table.id } });
      if (!session) {
        session = await tx.multiplayerTrainingSession.create({ data: { tableId: table.id, createdById: userId }, include: undefined });
      }
      if (session.status !== 'ACTIVE') throw new ApiError(409, 'TRAINING_CLOSED', 'Training is already closed');

      const existing = await tx.multiplayerTrainingParticipant.findUnique({ where: { tableParticipantId: tableParticipant.id } });
      if (existing) {
        return tx.multiplayerTrainingParticipant.update({
          where: { id: existing.id },
          data: { status: 'ENROLLED', leftAt: null },
          include: { trainingSession: { include: trainingInclude }, tableParticipant: true }
        });
      }

      const enrolledCount = await tx.multiplayerTrainingParticipant.count({ where: { trainingSessionId: session.id, status: 'ENROLLED' } });
      if (enrolledCount >= 6) throw new ApiError(409, 'ROOM_FULL', 'Training is full');
      return tx.multiplayerTrainingParticipant.create({
        data: { trainingSessionId: session.id, tableParticipantId: tableParticipant.id, userId },
        include: { trainingSession: { include: trainingInclude }, tableParticipant: true }
      });
    });
  } catch (error) {
    if ((error as { code?: string }).code !== 'P2002') throw error;
    const existing = await findParticipantByRoomUser(roomId, userId, db);
    if (!existing) throw error;
    return existing;
  }
}

export async function leaveTraining(roomId: string, userId: string, db: DbClient = prisma) {
  const participant = await findParticipantByRoomUser(roomId, userId, db);
  if (!participant) throw new ApiError(403, 'TRAINING_ACCESS_DENIED', 'You are not enrolled in this training');
  return db.multiplayerTrainingParticipant.update({
    where: { id: participant.id },
    data: { status: 'LEFT', leftAt: new Date() },
    include: { trainingSession: { include: trainingInclude }, tableParticipant: true }
  });
}

export async function listOwnDecisions(trainingSessionId: string, userId: string, query: { handId?: string; street?: 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER'; page: number; pageSize: number }, db: DbClient = prisma) {
  const where = { trainingSessionId, userId, ...(query.handId ? { handId: query.handId } : {}), ...(query.street ? { street: query.street } : {}) };
  const [items, total] = await Promise.all([
    db.multiplayerTrainingDecision.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    db.multiplayerTrainingDecision.count({ where })
  ]);
  return { items, total };
}

export async function createAcceptedDecision(input: {
  tableActionId: string;
  handId: string;
  userId: string;
  tableParticipantId: string;
  seatNumber: number;
  sequence: number;
  actionType: string;
  amount: number | null;
  handBeforeAction: HandState;
}, db: Prisma.TransactionClient) {
  const participant = await db.multiplayerTrainingParticipant.findFirst({
    where: { tableParticipantId: input.tableParticipantId, userId: input.userId, status: 'ENROLLED' }
  });
  if (!participant) return null;

  const actor = input.handBeforeAction.seats.find((seat) => seat.seatNumber === input.seatNumber);
  const ownSeat = input.handBeforeAction.seats.find((seat) => seat.seatNumber === input.handBeforeAction.seatToAct);
  const street = input.handBeforeAction.bettingRound === 'preflop'
    ? 'PREFLOP'
    : input.handBeforeAction.bettingRound.toUpperCase() as 'FLOP' | 'TURN' | 'RIVER';
  const legalActions = ownSeat ? computeLegalActions(input.handBeforeAction) : null;
  return db.multiplayerTrainingDecision.create({
    data: {
      trainingSessionId: participant.trainingSessionId,
      participantId: participant.id,
      handId: input.handId,
      tableActionId: input.tableActionId,
      userId: input.userId,
      sequence: input.sequence,
      street,
      decisionContextSnapshot: {
        ownHoleCards: actor?.holeCards ?? [],
        publicBoard: input.handBeforeAction.communityCards,
        pot: input.handBeforeAction.pots.reduce((sum, pot) => sum + pot.amount, 0),
        stacks: Object.fromEntries(input.handBeforeAction.seats.map((seat) => [String(seat.seatNumber), seat.stack])),
        position: `seat-${input.handBeforeAction.seatToAct ?? 'unknown'}`,
        priorPublicActions: input.handBeforeAction.actionHistory,
        legalActions
      } as unknown as Prisma.InputJsonValue,
      selectedAction: { type: input.actionType, amount: input.amount } as Prisma.InputJsonValue,
      evaluationStatus: 'UNAVAILABLE',
      equitySnapshot: { status: 'UNAVAILABLE', limitations: ['No compatible published strategy'] } as Prisma.InputJsonValue,
      explanationSnapshot: { factors: ['Strategy data unavailable'], assumptions: [], limitations: ['No compatible published strategy'] } as Prisma.InputJsonValue
    }
  });
}
