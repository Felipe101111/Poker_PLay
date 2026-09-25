import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma/client.js';

export function buildTestApp() {
  return createApp();
}

export async function resetDatabase() {
  await prisma.friendRequest.deleteMany();
  await prisma.user.deleteMany();
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
