import { MultiplayerActionType, RoomStatus } from '@prisma/client';
import { prisma } from '../../db/prisma/client.js';
import { ApiError } from '../../shared/errors.js';
import { startHand, submitAction } from '../../poker-engine/engine.js';
import { createTableFromStartedRoom, findTableByRoom, findTableForUser, findExpiredDisconnectedParticipants, markParticipantConnected, markParticipantDisconnected, readHandState, recordRejectedAction, touchParticipant } from './multiplayer.repository.js';
import { systemPresenceClock, shouldAutoFoldDisconnectedActingSeat } from './multiplayer.presence.js';
import { projectTable } from './multiplayer.projection.js';
import type { ReconnectInput, TableActionInput } from './multiplayer.validation.js';

function fail(status: number, code: ConstructorParameters<typeof ApiError>[1], message: string): never {
  throw new ApiError(status, code, message);
}

async function assertStartedRoomMember(roomId: string, userId: string) {
  const room = await prisma.pokerRoom.findUnique({ where: { id: roomId }, include: { members: true } });
  if (!room || room.status === RoomStatus.CLOSED) fail(404, 'ROOM_NOT_FOUND', 'No such room');
  if (room.status !== RoomStatus.STARTED || !room.members.some((member) => member.userId === userId)) {
    fail(403, 'ROOM_ACCESS_DENIED', 'You are not authorized to access this table');
  }
  return room;
}

async function loadOrBootstrap(roomId: string) {
  const current = await findTableByRoom(roomId);
  if (current) return current;
  try {
    return await prisma.$transaction((tx) => createTableFromStartedRoom(roomId, tx));
  } catch (error) {
    if (error instanceof Error && error.message === 'ROOM_NOT_STARTED') {
      fail(404, 'TABLE_NOT_FOUND', 'This room does not have a started table');
    }
    const raced = await findTableByRoom(roomId);
    if (raced) return raced;
    throw error;
  }
}

export const multiplayerService = {
  async getTable(roomId: string, userId: string) {
    await assertStartedRoomMember(roomId, userId);
    const table = await loadOrBootstrap(roomId);
    if (table.status === 'CLOSED') fail(409, 'TABLE_CLOSED', 'This table is closed');
    return { table: projectTable(table, userId) };
  },

  async reconnect(roomId: string, userId: string, _input: ReconnectInput) {
    await assertStartedRoomMember(roomId, userId);
    const table = await loadOrBootstrap(roomId);
    const participant = table.participants.find((item) => item.userId === userId);
    if (!participant) fail(403, 'ROOM_ACCESS_DENIED', 'You are not a table participant');
    await markParticipantConnected(table.id, userId, systemPresenceClock.now());
    const refreshed = await findTableForUser(roomId, userId);
    if (!refreshed) fail(404, 'TABLE_NOT_FOUND', 'No such table');
    return { table: projectTable(refreshed, userId) };
  },

  async heartbeat(roomId: string, userId: string) {
    await assertStartedRoomMember(roomId, userId);
    const table = await findTableForUser(roomId, userId);
    if (!table) fail(404, 'TABLE_NOT_FOUND', 'No such table');
    await touchParticipant(table.id, userId, systemPresenceClock.now());
  },

  async disconnect(roomId: string, userId: string) {
    const table = await findTableForUser(roomId, userId);
    if (!table) return;
    await markParticipantDisconnected(table.id, userId, systemPresenceClock.now());
  },

  async reapExpiredParticipants() {
    const now = systemPresenceClock.now();
    const expired = await findExpiredDisconnectedParticipants(now);
    const foldedRooms = new Set<string>();
    for (const participant of expired) {
      const table = participant.table;
      const hand = table.currentHand ? readHandState(table.currentHand.stateSnapshot) : null;
      if (!hand || !shouldAutoFoldDisconnectedActingSeat({ disconnectedAt: participant.disconnectedAt, seatNumber: participant.seatNumber, actingSeat: hand.seatToAct }, now)) {
        continue;
      }
      try {
        await this.act(table.roomId, participant.userId, {
          handId: table.currentHand!.id,
          expectedVersion: table.stateVersion,
          requestId: `timeout-fold:${table.currentHand!.id}:${participant.userId}`,
          type: 'fold'
        });
        foldedRooms.add(table.roomId);
      } catch (error) {
        if (!(error instanceof ApiError && ['NOT_YOUR_TURN', 'STALE_GAME_STATE', 'TABLE_CLOSED'].includes(error.code))) throw error;
      }
    }
    return [...foldedRooms];
  },

  async act(roomId: string, userId: string, input: TableActionInput) {
    await assertStartedRoomMember(roomId, userId);
    const table = await loadOrBootstrap(roomId);
    if (table.status === 'CLOSED') fail(409, 'TABLE_CLOSED', 'This table is closed');

    let rejection: ApiError | null = null;
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "multiplayer_tables" WHERE "id" = ${table.id} FOR UPDATE`;
      const locked = await findTableByRoom(roomId, tx);
      if (!locked || !locked.currentHand) fail(404, 'TABLE_NOT_FOUND', 'No active table hand');

      const duplicate = await tx.tableAction.findUnique({
        where: { handId_userId_requestId: { handId: locked.currentHand.id, userId, requestId: input.requestId } }
      });
      if (duplicate) {
        if (duplicate.accepted) return;
        rejection = new ApiError(409, (duplicate.rejectionCode as ConstructorParameters<typeof ApiError>[1]) ?? 'DUPLICATE_ACTION', 'This action was already rejected');
        return;
      }
      if (locked.currentHand.id !== input.handId || locked.currentHand.stateVersion !== input.expectedVersion) {
        fail(409, 'STALE_GAME_STATE', 'The table has advanced. Refresh the current table state.');
      }

      const participant = locked.participants.find((item) => item.userId === userId);
      if (!participant) fail(403, 'ROOM_ACCESS_DENIED', 'You are not a table participant');
      const hand = readHandState(locked.currentHand.stateSnapshot);
      if (hand.seatToAct !== participant.seatNumber) fail(409, 'NOT_YOUR_TURN', 'It is not your turn to act');

      try {
        submitAction(hand, {
          seatNumber: participant.seatNumber,
          type: input.type,
          amount: input.amount ?? null,
          bettingRound: hand.bettingRound as never
        });
      } catch (error) {
        if (error instanceof ApiError && error.code === 'ILLEGAL_ACTION') {
          rejection = new ApiError(409, 'ILLEGAL_ACTION', error.message);
          await recordRejectedAction({
            handId: locked.currentHand.id,
            requestId: input.requestId,
            userId,
            seatNumber: participant.seatNumber,
            actionType: input.type.toUpperCase().replace('-', '_') as MultiplayerActionType,
            amount: input.amount,
            rejectionCode: 'ILLEGAL_ACTION'
          }, tx);
          return;
        }
        throw error;
      }

      const nextVersion = locked.stateVersion + 1;
      await tx.tableAction.create({
        data: {
          handId: locked.currentHand.id,
          requestId: input.requestId,
          sequence: hand.actionHistory.length,
          userId,
          seatNumber: participant.seatNumber,
          actionType: input.type.toUpperCase().replace('-', '_') as MultiplayerActionType,
          amount: input.amount ?? null,
          accepted: true,
          resultingVersion: nextVersion
        }
      });
      const completed = hand.bettingRound === 'complete';
      await tx.multiplayerHand.update({
        where: { id: locked.currentHand.id },
        data: {
          stateSnapshot: hand as unknown as object,
          stateVersion: locked.currentHand.stateVersion + 1,
          actingSeat: hand.seatToAct,
          ...(completed ? { status: 'COMPLETED', completedAt: new Date(), resultSnapshot: hand.result as object } : {})
        }
      });
      for (const participant of locked.participants) {
        const seat = hand.seats.find((item) => item.seatNumber === participant.seatNumber);
        if (!seat) continue;
        await tx.tableParticipant.update({
          where: { id: participant.id },
          data: {
            stack: seat.stack,
            ...(completed && seat.stack === 0
              ? { eligibleForNextHand: false, connectionStatus: 'ELIMINATED', eliminatedAt: new Date() }
              : {})
          }
        });
      }

      const eligible = locked.participants.filter((participant) => {
        const seat = hand.seats.find((item) => item.seatNumber === participant.seatNumber);
        return seat && seat.stack > 0;
      });
      if (completed && eligible.length >= 2) {
        const ordered = [...locked.participants].sort((a, b) => a.seatNumber - b.seatNumber);
        const currentIndex = ordered.findIndex((participant) => participant.seatNumber === locked.dealerSeat);
        const nextDealer = [...ordered.slice(currentIndex + 1), ...ordered.slice(0, currentIndex + 1)].find((participant) => eligible.some((item) => item.id === participant.id))!;
        const startingStacks = ordered.map((participant) => hand.seats.find((seat) => seat.seatNumber === participant.seatNumber)?.stack ?? 0);
        const nextHand = startHand(locked.room.hostId, ordered.length, 1, undefined, startingStacks, nextDealer.seatNumber);
        const createdNextHand = await tx.multiplayerHand.create({
          data: {
            tableId: locked.id,
            handNumber: locked.handNumber + 1,
            stateSnapshot: nextHand as unknown as object,
            actingSeat: nextHand.seatToAct
          }
        });
        await tx.multiplayerTable.update({
          where: { id: locked.id },
          data: { handNumber: locked.handNumber + 1, dealerSeat: nextDealer.seatNumber, currentHandId: createdNextHand.id, stateVersion: nextVersion }
        });
      } else {
        await tx.multiplayerTable.update({
          where: { id: locked.id },
          data: { stateVersion: nextVersion, ...(completed ? { status: 'CLOSED', closedAt: new Date() } : {}) }
        });
      }
    });

    if (rejection) throw rejection;

    const updated = await findTableForUser(roomId, userId);
    if (!updated) fail(404, 'TABLE_NOT_FOUND', 'No such table');
    return { table: projectTable(updated, userId) };
  }
};
