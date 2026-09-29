import type { Server, Socket } from 'socket.io';
import { ApiError } from '../../shared/errors.js';
import { multiplayerService } from './multiplayer.service.js';
import { reconnectSchema, tableActionSchema } from './multiplayer.validation.js';
import { recordMultiplayerMetric } from './multiplayer.observability.js';
import { emitLatestTrainingDecision, registerTrainingSocketEvents } from './multiplayer.training.socket.js';

const tableRoom = (roomId: string) => `multiplayer-table:${roomId}`;

type SessionSocket = Socket & { data: { userId: string; tableRooms: Set<string> } };

type SocketPayload = { roomId?: unknown; lastSeenVersion?: unknown; handId?: unknown; expectedVersion?: unknown; requestId?: unknown; type?: unknown; amount?: unknown };

async function broadcastSnapshot(io: Server, roomId: string, cause = 'ACTION_ACCEPTED') {
  const sockets = await io.in(tableRoom(roomId)).fetchSockets();
  await Promise.all(
    sockets.map(async (rawSocket) => {
      const socket = rawSocket as unknown as SessionSocket;
      try {
        const snapshot = await multiplayerService.getTable(roomId, socket.data.userId);
        socket.emit('table:state-changed', { roomId, stateVersion: snapshot.table.stateVersion, cause, table: snapshot.table });
      } catch {
        socket.emit('table:error', { code: 'TABLE_NOT_FOUND', message: 'The table is no longer available' });
      }
    })
  );
}

function getUserId(socket: Socket): string | undefined {
  return (socket as SessionSocket).data.userId;
}

export function registerMultiplayerSocket(io: Server) {
  const activeConnections = new Map<string, Set<string>>();
  const connectionKey = (roomId: string, userId: string) => `${roomId}:${userId}`;
  const addConnection = (roomId: string, userId: string, socketId: string) => {
    const key = connectionKey(roomId, userId);
    const sockets = activeConnections.get(key) ?? new Set<string>();
    sockets.add(socketId);
    activeConnections.set(key, sockets);
  };
  const removeConnection = (roomId: string, userId: string, socketId: string) => {
    const key = connectionKey(roomId, userId);
    const sockets = activeConnections.get(key);
    if (!sockets) return true;
    sockets.delete(socketId);
    if (sockets.size > 0) return false;
    activeConnections.delete(key);
    return true;
  };
  const broadcastPresence = async (roomId: string, userId: string, status: 'ONLINE' | 'DISCONNECTED') => {
    let snapshot;
    try {
      snapshot = await multiplayerService.getTable(roomId, userId);
    } catch {
      return;
    }
    const player = snapshot.table.currentHand?.players.find((item) => item.userId === userId);
    if (!player) return;
    io.in(tableRoom(roomId)).emit('table:presence-changed', {
      roomId,
      stateVersion: snapshot.table.stateVersion,
      userId,
      seatNumber: player.seatNumber,
      status
    });
  };

  io.use((socket, next) => {
    const request = socket.request as typeof socket.request & { session?: { userId?: string } };
    if (!request.session?.userId) {
      next(new ApiError(401, 'UNAUTHENTICATED', 'Authentication required'));
      return;
    }
    const sessionSocket = socket as SessionSocket;
    sessionSocket.data.userId = request.session.userId;
    sessionSocket.data.tableRooms = new Set();
    next();
  });

  io.on('connection', (socket) => {
    const sessionSocket = socket as SessionSocket;
    registerTrainingSocketEvents(socket, getUserId(socket)!);
    recordMultiplayerMetric('socket.connected', { userId: getUserId(socket) ?? 'unknown' });
    socket.on('table:join', async (payload: SocketPayload, acknowledge?: (response: unknown) => void) => {
      const roomId = typeof payload?.roomId === 'string' ? payload.roomId : '';
      try {
        const snapshot = await multiplayerService.reconnect(roomId, getUserId(socket)!, reconnectSchema.parse({ lastSeenVersion: payload?.lastSeenVersion ?? 0 }));
        recordMultiplayerMetric('table.reconnected', { roomId });
        await socket.join(tableRoom(roomId));
        sessionSocket.data.tableRooms.add(tableRoom(roomId));
        addConnection(roomId, getUserId(socket)!, socket.id);
        await broadcastPresence(roomId, getUserId(socket)!, 'ONLINE');
        socket.emit('table:snapshot', { roomId, stateVersion: snapshot.table.stateVersion, table: snapshot.table });
        acknowledge?.({ ok: true });
      } catch (error) {
        acknowledge?.({ ok: false, code: error instanceof ApiError ? error.code : 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unexpected server error' });
      }
    });

    socket.on('table:leave', async (payload: SocketPayload) => {
      if (typeof payload?.roomId !== 'string') return;
      if (removeConnection(payload.roomId, getUserId(socket)!, socket.id)) {
        await multiplayerService.disconnect(payload.roomId, getUserId(socket)!);
        await broadcastPresence(payload.roomId, getUserId(socket)!, 'DISCONNECTED');
      }
      await socket.leave(tableRoom(payload.roomId));
      sessionSocket.data.tableRooms.delete(tableRoom(payload.roomId));
    });

    socket.on('table:heartbeat', async (payload: SocketPayload) => {
      if (typeof payload?.roomId !== 'string') return;
      try {
        await multiplayerService.heartbeat(payload.roomId, getUserId(socket)!);
      } catch {
        // Heartbeats are best-effort; the next snapshot or reconnect reports authorization errors.
      }
    });

    socket.on('table:action', async (payload: SocketPayload, acknowledge?: (response: unknown) => void) => {
      if (typeof payload?.roomId !== 'string') return;
      const parsed = tableActionSchema.safeParse(payload);
      if (!parsed.success) {
        acknowledge?.({ ok: false, code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid table action' });
        return;
      }
      try {
        const result = await multiplayerService.act(payload.roomId, getUserId(socket)!, parsed.data);
        await broadcastSnapshot(io, payload.roomId, result.cause);
        await emitLatestTrainingDecision(socket, payload.roomId, getUserId(socket)!);
        acknowledge?.({ ok: true });
      } catch (error) {
        const apiError = error instanceof ApiError ? error : new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error');
        acknowledge?.({ ok: false, code: apiError.code, message: apiError.message });
        socket.emit('table:error', { code: apiError.code, message: apiError.message });
      }
    });

    socket.on('table:abandon', async (payload: SocketPayload, acknowledge?: (response: unknown) => void) => {
      const roomId = typeof payload?.roomId === 'string' ? payload.roomId : '';
      if (!roomId) {
        acknowledge?.({ ok: false, code: 'VALIDATION_ERROR', message: 'Invalid room id' });
        return;
      }
      try {
        const result = await multiplayerService.abandon(roomId, getUserId(socket)!);
        await socket.leave(tableRoom(roomId));
        sessionSocket.data.tableRooms.delete(tableRoom(roomId));
        removeConnection(roomId, getUserId(socket)!, socket.id);
        acknowledge?.({ ok: true });
        await broadcastSnapshot(io, roomId, result.cause);
      } catch (error) {
        const apiError = error instanceof ApiError ? error : new ApiError(500, 'INTERNAL_ERROR', 'Unexpected server error');
        acknowledge?.({ ok: false, code: apiError.code, message: apiError.message });
      }
    });

    socket.on('disconnect', async () => {
      const userId = getUserId(socket)!;
      recordMultiplayerMetric('socket.disconnected', { userId });
      const rooms = [...sessionSocket.data.tableRooms].map((room) => room.replace('multiplayer-table:', ''));
      for (const roomId of rooms) {
        if (removeConnection(roomId, userId, socket.id)) {
          await multiplayerService.disconnect(roomId, userId);
          await broadcastPresence(roomId, userId, 'DISCONNECTED');
        }
      }
    });
  });

  const reaper = setInterval(async () => {
    const foldedRooms = await multiplayerService.reapExpiredParticipants();
    await Promise.all(foldedRooms.map((roomId) => broadcastSnapshot(io, roomId)));
  }, 5_000);
  reaper.unref();
}
