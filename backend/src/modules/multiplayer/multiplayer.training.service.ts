import { ApiError } from '../../shared/errors.js';
import { multiplayerService } from './multiplayer.service.js';
import { projectTable } from './multiplayer.projection.js';
import { createOrJoinTraining, findTrainingByRoomForUser, leaveTraining, listOwnDecisions } from './multiplayer.training.repository.js';
import { projectTrainingDecision, projectTrainingParticipant } from './multiplayer.training.projection.js';
import type { TrainingDecisionListResponse, MultiplayerTrainingResponse } from './multiplayer.training.types.js';

export const multiplayerTrainingService = {
  async join(roomId: string, userId: string): Promise<MultiplayerTrainingResponse> {
    await multiplayerService.getTable(roomId, userId);
    const participant = await createOrJoinTraining(roomId, userId);
    const table = await multiplayerService.getTable(roomId, userId);
    const session = participant.trainingSession;
    return {
      training: {
        id: session.id,
        tableId: session.tableId,
        status: session.status,
        participant: projectTrainingParticipant({ ...participant, tableParticipant: participant.tableParticipant }),
        decisions: session.decisions.filter((decision: (typeof session.decisions)[number]) => decision.userId === userId).map(projectTrainingDecision)
      },
      table: table.table
    };
  },

  async get(roomId: string, userId: string): Promise<MultiplayerTrainingResponse> {
    const session = await findTrainingByRoomForUser(roomId, userId);
    if (!session) throw new ApiError(404, 'TRAINING_NOT_FOUND', 'Training session not found');
    const participant = session.participants.find((item) => item.userId === userId);
    if (!participant) throw new ApiError(403, 'TRAINING_ACCESS_DENIED', 'You are not enrolled in this training');
    const table = await multiplayerService.getTable(roomId, userId);
    return {
      training: {
        id: session.id,
        tableId: session.tableId,
        status: session.status,
        participant: projectTrainingParticipant(participant),
        decisions: session.decisions.filter((decision: (typeof session.decisions)[number]) => decision.userId === userId).map(projectTrainingDecision)
      },
      table: table.table
    };
  },

  async decisions(roomId: string, userId: string, query: { handId?: string; street?: 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER'; page: number; pageSize: number }): Promise<TrainingDecisionListResponse> {
    const session = await findTrainingByRoomForUser(roomId, userId);
    if (!session) throw new ApiError(404, 'TRAINING_NOT_FOUND', 'Training session not found');
    const result = await listOwnDecisions(session.id, userId, query);
    return { items: result.items.map(projectTrainingDecision), page: query.page, pageSize: query.pageSize, total: result.total };
  },

  async leave(roomId: string, userId: string) {
    const participant = await leaveTraining(roomId, userId);
    const table = await multiplayerService.getTable(roomId, userId);
    return { training: { participantStatus: participant.status }, table: table.table };
  }
};
