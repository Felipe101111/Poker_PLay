import type { Socket } from 'socket.io';
import { ApiError } from '../../shared/errors.js';
import { multiplayerTrainingService } from './multiplayer.training.service.js';
import { trainingSocketPayloadSchema } from './multiplayer.training.validation.js';

type Acknowledge = (response: { ok: boolean; code?: string; message?: string }) => void;

export function registerTrainingSocketEvents(socket: Socket, userId: string) {
  socket.on('training:join', async (payload: unknown, acknowledge?: Acknowledge) => {
    const parsed = trainingSocketPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      acknowledge?.({ ok: false, code: 'VALIDATION_ERROR', message: 'Invalid training room id' });
      return;
    }
    try {
      const result = await multiplayerTrainingService.join(parsed.data.roomId, userId);
      socket.emit('training:joined', { roomId: parsed.data.roomId, trainingSessionId: result.training.id, participantStatus: result.training.participant.status });
      acknowledge?.({ ok: true });
    } catch (error) {
      acknowledge?.({ ok: false, code: error instanceof ApiError ? error.code : 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unexpected server error' });
    }
  });

  socket.on('training:leave', async (payload: unknown, acknowledge?: Acknowledge) => {
    const parsed = trainingSocketPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      acknowledge?.({ ok: false, code: 'VALIDATION_ERROR', message: 'Invalid training room id' });
      return;
    }
    try {
      await multiplayerTrainingService.leave(parsed.data.roomId, userId);
      acknowledge?.({ ok: true });
    } catch (error) {
      acknowledge?.({ ok: false, code: error instanceof ApiError ? error.code : 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unexpected server error' });
    }
  });
}

export async function emitLatestTrainingDecision(socket: Socket, roomId: string, userId: string) {
  try {
    const result = await multiplayerTrainingService.get(roomId, userId);
    const decision = result.training.decisions[0];
    if (!decision) return;
    socket.emit('training:decision-evaluated', {
      roomId,
      trainingSessionId: result.training.id,
      decision
    });
  } catch {
    // Table action acknowledgement remains authoritative; private feedback is recoverable over HTTP.
  }
}
