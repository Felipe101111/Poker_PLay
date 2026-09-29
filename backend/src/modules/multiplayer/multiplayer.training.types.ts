import type {
  MultiplayerTrainingParticipantStatus,
  MultiplayerTrainingSessionStatus,
  TrainingEvaluationCategory,
  TrainingEvaluationStatus,
  TrainingStreet
} from '@prisma/client';
import type { TableView } from './multiplayer.types.js';

export type { MultiplayerTrainingParticipantStatus, MultiplayerTrainingSessionStatus, TrainingEvaluationCategory, TrainingEvaluationStatus, TrainingStreet };

export interface TrainingDecisionContext {
  ownHoleCards: unknown[];
  publicBoard: unknown[];
  pot: number;
  stacks: Record<string, number>;
  position: string;
  priorPublicActions: unknown[];
  legalActions: unknown;
}

export interface TrainingDecisionFeedback {
  id: string;
  handId: string;
  street: TrainingStreet;
  selectedAction: Record<string, unknown>;
  evaluationStatus: TrainingEvaluationStatus;
  category: TrainingEvaluationCategory | null;
  equity: unknown;
  strategy: unknown;
  explanation: Record<string, unknown>;
}

export interface TrainingParticipantView {
  id: string;
  userId: string;
  seatNumber: number;
  status: MultiplayerTrainingParticipantStatus;
  joinedAt: string;
  leftAt: string | null;
}

export interface MultiplayerTrainingView {
  id: string;
  tableId: string;
  status: MultiplayerTrainingSessionStatus;
  participant: TrainingParticipantView;
  decisions: TrainingDecisionFeedback[];
}

export interface MultiplayerTrainingResponse {
  training: MultiplayerTrainingView;
  table: TableView;
}

export interface TrainingDecisionListResponse {
  items: TrainingDecisionFeedback[];
  page: number;
  pageSize: number;
  total: number;
}
