-- CreateEnum
CREATE TYPE "RoomVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('WAITING', 'STARTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RoomInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'INVALIDATED');

-- CreateTable
CREATE TABLE "poker_rooms" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "visibility" "RoomVisibility" NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'WAITING',
    "seatLimit" INTEGER NOT NULL,
    "minPlayers" INTEGER NOT NULL,
    "startingStackBB" INTEGER NOT NULL,
    "smallBlind" INTEGER NOT NULL,
    "bigBlind" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "poker_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_members" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "ready" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_invitations" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" "RoomInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "poker_rooms_status_visibility_createdAt_idx" ON "poker_rooms"("status", "visibility", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "room_members_userId_key" ON "room_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "room_members_roomId_userId_key" ON "room_members"("roomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "room_members_roomId_seatNumber_key" ON "room_members"("roomId", "seatNumber");

-- CreateIndex
CREATE INDEX "room_members_roomId_joinedAt_idx" ON "room_members"("roomId", "joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "room_invitations_roomId_toUserId_key" ON "room_invitations"("roomId", "toUserId");

-- CreateIndex
CREATE INDEX "room_invitations_toUserId_status_createdAt_idx" ON "room_invitations"("toUserId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "poker_rooms" ADD CONSTRAINT "poker_rooms_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "poker_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_invitations" ADD CONSTRAINT "room_invitations_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "poker_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_invitations" ADD CONSTRAINT "room_invitations_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_invitations" ADD CONSTRAINT "room_invitations_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
