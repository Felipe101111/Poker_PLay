import { prisma } from '../../db/prisma/client.js';

export const trainerInclude = {
  currentScenario: true,
  scenarios: { include: { decisions: true }, orderBy: { sequence: 'desc' as const } }
} as const;

export type TrainerSessionWithDetails = Awaited<ReturnType<typeof findSessionByUser>>;

export async function findSessionByUser(userId: string, db = prisma) {
  return db.trainingSession.findFirst({ where: { userId, status: 'ACTIVE' }, include: trainerInclude });
}

export async function findSessionByIdForUser(id: string, userId: string, db = prisma) {
  return db.trainingSession.findFirst({ where: { id, userId }, include: trainerInclude });
}

export async function createSession(userId: string, data: { scenario: Record<string, unknown> }, db = prisma) {
  return db.trainingSession.create({
    data: {
      userId,
      format: 'SIX_MAX_100BB_PREFLOP',
      scenarios: { create: data.scenario as never }
    },
    include: trainerInclude
  });
}

export async function getDecisionForUser(scenarioId: string, userId: string, db = prisma) {
  return db.trainingDecision.findFirst({ where: { scenarioId, userId } });
}

export async function countProgress(userId: string, db = prisma) {
  const decisions = await db.trainingDecision.findMany({ where: { userId }, select: { evaluationStatus: true, category: true, selectedAction: true } });
  return decisions;
}
