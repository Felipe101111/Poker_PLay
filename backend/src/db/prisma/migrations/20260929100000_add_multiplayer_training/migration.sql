-- Feature 013: multiplayer training overlay and immutable decision snapshots
ALTER TYPE "TrainingStreet" ADD VALUE 'PREFLOP';

CREATE TYPE "MultiplayerTrainingSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MultiplayerTrainingParticipantStatus" AS ENUM ('ENROLLED', 'LEFT', 'REMOVED');

CREATE TABLE "multiplayer_training_sessions" (
  "id" TEXT NOT NULL,
  "tableId" TEXT NOT NULL,
  "format" "TrainingSessionFormat" NOT NULL DEFAULT 'SIX_MAX_100BB_PREFLOP',
  "status" "MultiplayerTrainingSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "multiplayer_training_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "multiplayer_training_participants" (
  "id" TEXT NOT NULL,
  "trainingSessionId" TEXT NOT NULL,
  "tableParticipantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "MultiplayerTrainingParticipantStatus" NOT NULL DEFAULT 'ENROLLED',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  CONSTRAINT "multiplayer_training_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "multiplayer_training_decisions" (
  "id" TEXT NOT NULL,
  "trainingSessionId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "handId" TEXT NOT NULL,
  "tableActionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "street" "TrainingStreet" NOT NULL,
  "decisionContextSnapshot" JSONB NOT NULL,
  "selectedAction" JSONB NOT NULL,
  "evaluationStatus" "TrainingEvaluationStatus" NOT NULL,
  "category" "TrainingEvaluationCategory",
  "equitySnapshot" JSONB NOT NULL,
  "strategyVersionSnapshot" JSONB,
  "strategyRowSnapshot" JSONB,
  "explanationSnapshot" JSONB NOT NULL,
  "calculationFingerprint" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "multiplayer_training_decisions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "evaluation_snapshots" ADD COLUMN "multiplayerTrainingDecisionId" TEXT;

CREATE UNIQUE INDEX "multiplayer_training_sessions_tableId_key" ON "multiplayer_training_sessions"("tableId");
CREATE INDEX "multiplayer_training_sessions_status_createdAt_idx" ON "multiplayer_training_sessions"("status", "createdAt");
CREATE UNIQUE INDEX "multiplayer_training_participants_tableParticipantId_key" ON "multiplayer_training_participants"("tableParticipantId");
CREATE UNIQUE INDEX "multiplayer_training_participants_trainingSessionId_tableParticipantId_key" ON "multiplayer_training_participants"("trainingSessionId", "tableParticipantId");
CREATE UNIQUE INDEX "multiplayer_training_participants_trainingSessionId_userId_key" ON "multiplayer_training_participants"("trainingSessionId", "userId");
CREATE INDEX "multiplayer_training_participants_userId_status_idx" ON "multiplayer_training_participants"("userId", "status");
CREATE UNIQUE INDEX "multiplayer_training_decisions_tableActionId_key" ON "multiplayer_training_decisions"("tableActionId");
CREATE UNIQUE INDEX "multiplayer_training_decisions_handId_userId_sequence_key" ON "multiplayer_training_decisions"("handId", "userId", "sequence");
CREATE INDEX "multiplayer_training_decisions_trainingSessionId_userId_createdAt_idx" ON "multiplayer_training_decisions"("trainingSessionId", "userId", "createdAt");
CREATE INDEX "multiplayer_training_decisions_participantId_createdAt_idx" ON "multiplayer_training_decisions"("participantId", "createdAt");
CREATE UNIQUE INDEX "evaluation_snapshots_multiplayerTrainingDecisionId_key" ON "evaluation_snapshots"("multiplayerTrainingDecisionId");

ALTER TABLE "multiplayer_training_sessions"
  ADD CONSTRAINT "multiplayer_training_sessions_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "multiplayer_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "multiplayer_training_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "multiplayer_training_participants"
  ADD CONSTRAINT "multiplayer_training_participants_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "multiplayer_training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "multiplayer_training_participants_tableParticipantId_fkey" FOREIGN KEY ("tableParticipantId") REFERENCES "table_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "multiplayer_training_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "multiplayer_training_decisions"
  ADD CONSTRAINT "multiplayer_training_decisions_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "multiplayer_training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "multiplayer_training_decisions_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "multiplayer_training_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "multiplayer_training_decisions_handId_fkey" FOREIGN KEY ("handId") REFERENCES "multiplayer_hands"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "multiplayer_training_decisions_tableActionId_fkey" FOREIGN KEY ("tableActionId") REFERENCES "table_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "multiplayer_training_decisions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "evaluation_snapshots"
  ADD CONSTRAINT "evaluation_snapshots_multiplayerTrainingDecisionId_fkey" FOREIGN KEY ("multiplayerTrainingDecisionId") REFERENCES "multiplayer_training_decisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
