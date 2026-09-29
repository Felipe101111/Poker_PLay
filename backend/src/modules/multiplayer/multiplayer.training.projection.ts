import type { MultiplayerTrainingDecision, MultiplayerTrainingParticipant } from '@prisma/client';
import type { TrainingDecisionFeedback, TrainingParticipantView } from './multiplayer.training.types.js';

export function projectTrainingParticipant(participant: MultiplayerTrainingParticipant & { tableParticipant: { seatNumber: number } }): TrainingParticipantView {
  return {
    id: participant.id,
    userId: participant.userId,
    seatNumber: participant.tableParticipant.seatNumber,
    status: participant.status,
    joinedAt: participant.joinedAt.toISOString(),
    leftAt: participant.leftAt?.toISOString() ?? null
  };
}

export function projectTrainingDecision(decision: MultiplayerTrainingDecision): TrainingDecisionFeedback {
  return {
    id: decision.id,
    handId: decision.handId,
    street: decision.street,
    selectedAction: decision.selectedAction as Record<string, unknown>,
    evaluationStatus: decision.evaluationStatus,
    category: decision.category,
    equity: decision.equitySnapshot,
    strategy: decision.strategyVersionSnapshot && decision.strategyRowSnapshot
      ? { version: decision.strategyVersionSnapshot, row: decision.strategyRowSnapshot }
      : null,
    explanation: decision.explanationSnapshot as Record<string, unknown>
  };
}
