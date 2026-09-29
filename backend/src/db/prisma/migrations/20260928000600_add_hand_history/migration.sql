-- CreateEnum
CREATE TYPE "HandHistorySourceType" AS ENUM ('LOCAL_GAME', 'MULTIPLAYER', 'TRAINER');

-- CreateEnum
CREATE TYPE "HandHistoryStatus" AS ENUM ('COMPLETED', 'FOLDED', 'ALL_IN', 'ABANDONED', 'ANONYMIZED');

-- CreateEnum
CREATE TYPE "HandActionStreet" AS ENUM ('PREFLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN', 'TERMINAL');

-- CreateEnum
CREATE TYPE "HandActionType" AS ENUM ('FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN', 'BLIND', 'DEAL', 'SHOWDOWN', 'TERMINAL');

-- CreateEnum
CREATE TYPE "HandHistoryParticipantRole" AS ENUM ('PLAYER', 'SPECTATOR');

-- CreateEnum
CREATE TYPE "HandHistoryParticipantVisibility" AS ENUM ('PARTICIPANT', 'AUTHORIZED_VIEWER', 'ANONYMIZED');

-- CreateEnum
CREATE TYPE "HistoryRedactionProfile" AS ENUM ('FULL_AUTHORIZED', 'PUBLIC_ONLY', 'ANONYMIZED');

-- CreateTable
CREATE TABLE "hand_histories" (
    "id" TEXT NOT NULL,
    "sourceType" "HandHistorySourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "HandHistoryStatus" NOT NULL,
    "format" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "sequenceVersion" INTEGER NOT NULL DEFAULT 1,
    "publicSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "hand_histories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hand_history_participants" (
    "id" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "userId" TEXT,
    "seatNumber" INTEGER NOT NULL,
    "displayNameSnapshot" TEXT,
    "role" "HandHistoryParticipantRole" NOT NULL DEFAULT 'PLAYER',
    "visibility" "HandHistoryParticipantVisibility" NOT NULL DEFAULT 'PARTICIPANT',
    CONSTRAINT "hand_history_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hand_actions" (
    "id" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "street" "HandActionStreet" NOT NULL,
    "seatNumber" INTEGER,
    "actionType" "HandActionType" NOT NULL,
    "amount" INTEGER,
    "publicStateAfter" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "hand_actions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "history_access_policies" (
    "id" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "canList" BOOLEAN NOT NULL DEFAULT true,
    "canViewDetail" BOOLEAN NOT NULL DEFAULT true,
    "canRequestRemoval" BOOLEAN NOT NULL DEFAULT true,
    "redactionProfile" "HistoryRedactionProfile" NOT NULL DEFAULT 'FULL_AUTHORIZED',
    "anonymizedAt" TIMESTAMP(3),
    CONSTRAINT "history_access_policies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "hand_histories_endedAt_id_idx" ON "hand_histories"("endedAt", "id");
CREATE INDEX "hand_histories_format_status_endedAt_idx" ON "hand_histories"("format", "status", "endedAt");
CREATE UNIQUE INDEX "hand_histories_sourceType_sourceId_key" ON "hand_histories"("sourceType", "sourceId");
CREATE INDEX "hand_history_participants_userId_historyId_idx" ON "hand_history_participants"("userId", "historyId");
CREATE UNIQUE INDEX "hand_history_participants_historyId_seatNumber_key" ON "hand_history_participants"("historyId", "seatNumber");
CREATE INDEX "hand_actions_historyId_sequence_idx" ON "hand_actions"("historyId", "sequence");
CREATE UNIQUE INDEX "hand_actions_historyId_sequence_key" ON "hand_actions"("historyId", "sequence");
CREATE INDEX "history_access_policies_userId_canList_historyId_idx" ON "history_access_policies"("userId", "canList", "historyId");
CREATE UNIQUE INDEX "history_access_policies_historyId_userId_key" ON "history_access_policies"("historyId", "userId");

ALTER TABLE "hand_history_participants" ADD CONSTRAINT "hand_history_participants_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "hand_histories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hand_history_participants" ADD CONSTRAINT "hand_history_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hand_actions" ADD CONSTRAINT "hand_actions_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "hand_histories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "history_access_policies" ADD CONSTRAINT "history_access_policies_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "hand_histories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "history_access_policies" ADD CONSTRAINT "history_access_policies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
