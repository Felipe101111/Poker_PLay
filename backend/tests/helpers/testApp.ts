import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma/client.js';

export function buildTestApp() {
  return createApp();
}

export async function resetDatabase() {
  await prisma.trainingDecision.deleteMany();
  await prisma.trainingScenario.deleteMany();
  await prisma.trainingSession.deleteMany();
  await prisma.tableAction.deleteMany();
  await prisma.multiplayerHand.deleteMany();
  await prisma.tableParticipant.deleteMany();
  await prisma.multiplayerTable.deleteMany();
  await prisma.roomInvitation.deleteMany();
  await prisma.roomMember.deleteMany();
  await prisma.pokerRoom.deleteMany();
  await prisma.friendRequest.deleteMany();
  await prisma.user.deleteMany();
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
