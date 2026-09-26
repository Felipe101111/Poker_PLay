-- CreateEnum
CREATE TYPE "MultiplayerTableStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "MultiplayerHandStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ParticipantConnectionStatus" AS ENUM ('ONLINE', 'DISCONNECTED', 'ELIMINATED');

-- CreateEnum
CREATE TYPE "MultiplayerActionType" AS ENUM ('FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN');

-- CreateTable
CREATE TABLE "multiplayer_tables" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "status" "MultiplayerTableStatus" NOT NULL DEFAULT 'ACTIVE',
    "handNumber" INTEGER NOT NULL DEFAULT 1,
    "currentHandId" TEXT,
    "dealerSeat" INTEGER NOT NULL,
    "stateVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "multiplayer_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_participants" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomMemberId" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "stack" INTEGER NOT NULL,
    "eligibleForNextHand" BOOLEAN NOT NULL DEFAULT true,
    "connectionStatus" "ParticipantConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" TIMESTAMP(3),
    "eliminatedAt" TIMESTAMP(3),

    CONSTRAINT "table_participants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "table_participants_stack_check" CHECK ("stack" >= 0)
);

-- CreateTable
CREATE TABLE "multiplayer_hands" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "handNumber" INTEGER NOT NULL,
    "status" "MultiplayerHandStatus" NOT NULL DEFAULT 'ACTIVE',
    "stateSnapshot" JSONB NOT NULL,
    "stateVersion" INTEGER NOT NULL DEFAULT 1,
    "actingSeat" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "resultSnapshot" JSONB,

    CONSTRAINT "multiplayer_hands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_actions" (
    "id" TEXT NOT NULL,
    "handId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "actionType" "MultiplayerActionType" NOT NULL,
    "amount" INTEGER,
    "accepted" BOOLEAN NOT NULL,
    "rejectionCode" TEXT,
    "resultingVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "table_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "multiplayer_tables_roomId_key" ON "multiplayer_tables"("roomId");
CREATE UNIQUE INDEX "multiplayer_tables_currentHandId_key" ON "multiplayer_tables"("currentHandId");
CREATE INDEX "multiplayer_tables_status_updatedAt_idx" ON "multiplayer_tables"("status", "updatedAt");

CREATE UNIQUE INDEX "table_participants_roomMemberId_key" ON "table_participants"("roomMemberId");
CREATE UNIQUE INDEX "table_participants_tableId_userId_key" ON "table_participants"("tableId", "userId");
CREATE UNIQUE INDEX "table_participants_tableId_seatNumber_key" ON "table_participants"("tableId", "seatNumber");
CREATE INDEX "table_participants_tableId_eligibleForNextHand_idx" ON "table_participants"("tableId", "eligibleForNextHand");
CREATE INDEX "table_participants_connectionStatus_disconnectedAt_idx" ON "table_participants"("connectionStatus", "disconnectedAt");

CREATE UNIQUE INDEX "multiplayer_hands_tableId_handNumber_key" ON "multiplayer_hands"("tableId", "handNumber");
CREATE INDEX "multiplayer_hands_tableId_status_idx" ON "multiplayer_hands"("tableId", "status");

CREATE UNIQUE INDEX "table_actions_handId_userId_requestId_key" ON "table_actions"("handId", "userId", "requestId");
CREATE UNIQUE INDEX "table_actions_handId_sequence_key" ON "table_actions"("handId", "sequence");
CREATE INDEX "table_actions_handId_createdAt_idx" ON "table_actions"("handId", "createdAt");

-- AddForeignKey
ALTER TABLE "multiplayer_tables" ADD CONSTRAINT "multiplayer_tables_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "poker_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "multiplayer_tables" ADD CONSTRAINT "multiplayer_tables_currentHandId_fkey" FOREIGN KEY ("currentHandId") REFERENCES "multiplayer_hands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "table_participants" ADD CONSTRAINT "table_participants_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "multiplayer_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "table_participants" ADD CONSTRAINT "table_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "table_participants" ADD CONSTRAINT "table_participants_roomMemberId_fkey" FOREIGN KEY ("roomMemberId") REFERENCES "room_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "multiplayer_hands" ADD CONSTRAINT "multiplayer_hands_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "multiplayer_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "table_actions" ADD CONSTRAINT "table_actions_handId_fkey" FOREIGN KEY ("handId") REFERENCES "multiplayer_hands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "table_actions" ADD CONSTRAINT "table_actions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
