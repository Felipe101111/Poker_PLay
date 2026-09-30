import { prisma } from '../../db/prisma/client.js';
import type { Prisma } from '@prisma/client';
import type { EvaluationSnapshot } from '../strategy/strategy.types.js';
import { insertEvaluationSnapshot } from '../strategy/strategy.snapshot.repository.js';

export const trainerInclude = {
  currentScenario: true,
  scenarios: { include: { decisions: true }, orderBy: { sequence: 'desc' as const } }
} as const;

export type TrainerSessionWithDetails = Awaited<ReturnType<typeof findSessionByUser>>;

export async function findSessionByUser(userId: string, db = prisma) {
  return db.trainingSession.findFirst({ where: { userId, status: 'ACTIVE' }, include: trainerInclude });
}

export async function replaceUnsupportedCurrentScenario(
  userId: string,
  expectedScenarioId: string,
  scenario: Omit<Prisma.TrainingScenarioUncheckedCreateWithoutSessionInput, 'sequence'>,
  db = prisma
) {
  return db.$transaction(async (tx) => {
    const candidate = await tx.trainingSession.findFirst({
      where: { userId, status: 'ACTIVE', format: 'SIX_MAX_100BB_PREFLOP', currentScenarioId: expectedScenarioId },
      select: { id: true }
    });
    if (!candidate) return null;

    await tx.$queryRaw`SELECT "id" FROM "training_sessions" WHERE "id" = ${candidate.id} FOR UPDATE`;
    const session = await tx.trainingSession.findUnique({ where: { id: candidate.id }, include: trainerInclude });
    if (!session || session.currentScenarioId !== expectedScenarioId) return session;

    const existingDecision = await tx.trainingDecision.findFirst({ where: { scenarioId: expectedScenarioId, userId } });
    if (existingDecision) return session;

    const previous = await tx.trainingScenario.aggregate({ where: { sessionId: session.id }, _max: { sequence: true } });
    const replacement = await tx.trainingScenario.create({
      data: { ...scenario, sessionId: session.id, sequence: (previous._max.sequence ?? 0) + 1 }
    });
    return tx.trainingSession.update({
      where: { id: session.id },
      data: { currentScenarioId: replacement.id },
      include: trainerInclude
    });
  });
}

export async function findPostflopSessionByUser(userId: string, db = prisma) {
  return db.trainingSession.findFirst({ where: { userId, status: 'ACTIVE', format: 'SIX_MAX_100BB_POSTFLOP' }, include: trainerInclude });
}

export async function findLatestPostflopSessionByUser(userId: string, db = prisma) {
  return db.trainingSession.findFirst({ where: { userId, format: 'SIX_MAX_100BB_POSTFLOP' }, include: trainerInclude, orderBy: { updatedAt: 'desc' } });
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

export async function createSessionWithScenario(
  userId: string,
  scenario: Prisma.TrainingScenarioUncheckedCreateWithoutSessionInput,
  db = prisma,
  format: 'SIX_MAX_100BB_PREFLOP' | 'SIX_MAX_100BB_POSTFLOP' = 'SIX_MAX_100BB_PREFLOP'
) {
  try {
    return await db.$transaction(async (tx) => {
      const session = await tx.trainingSession.create({ data: { userId, format } });
      const createdScenario = await tx.trainingScenario.create({ data: { ...scenario, sessionId: session.id } });
      return tx.trainingSession.update({ where: { id: session.id }, data: { currentScenarioId: createdScenario.id }, include: { currentScenario: true } });
    });
  } catch (error) {
    if ((error as { code?: string }).code !== 'P2002') throw error;
    const existing = await findSessionByUser(userId, db);
    if (!existing) throw error;
    return existing;
  }
}

export async function getOrderedPostflopScenarios(sessionId: string, userId: string, db = prisma) {
  return db.trainingScenario.findMany({
    where: { sessionId, session: { userId, format: 'SIX_MAX_100BB_POSTFLOP' } },
    include: { decisions: true },
    orderBy: { sequence: 'asc' }
  });
}

export async function completePostflopSession(sessionId: string, userId: string, db = prisma) {
  return db.trainingSession.updateMany({
    where: { id: sessionId, userId, format: 'SIX_MAX_100BB_POSTFLOP', status: 'ACTIVE' },
    data: { status: 'COMPLETED', completedAt: new Date(), currentScenarioId: null }
  });
}

export async function markPostflopScenarioTerminal(scenarioId: string, sessionId: string, userId: string, terminalReason: 'FOLD' | 'ALL_IN' | 'SHOWDOWN' | 'COMPLETE', db = prisma) {
  return db.trainingScenario.updateMany({
    where: { id: scenarioId, sessionId, session: { userId, format: 'SIX_MAX_100BB_POSTFLOP' } },
    data: { terminalReason }
  });
}

export async function getDecisionForUser(scenarioId: string, userId: string, db = prisma) {
  return db.trainingDecision.findFirst({ where: { scenarioId, userId } });
}

export async function findScenarioById(id: string, db = prisma) {
  return db.trainingScenario.findUnique({ where: { id }, include: { session: true } });
}

export async function insertDecisionIdempotent(data: Prisma.TrainingDecisionUncheckedCreateInput, db = prisma) {
  try {
    return { decision: await db.trainingDecision.create({ data }), duplicate: false };
  } catch (error) {
    if ((error as { code?: string }).code !== 'P2002') throw error;
    const existing = await getDecisionForUser(data.scenarioId, data.userId, db);
    if (!existing) throw error;
    return { decision: existing, duplicate: true };
  }
}

export async function continueSession(
  sessionId: string,
  userId: string,
  decisionId: string,
  scenario: Prisma.TrainingScenarioUncheckedCreateWithoutSessionInput,
  db = prisma
) {
  return db.$transaction(async (tx) => {
    const decision = await tx.trainingDecision.findFirst({ where: { id: decisionId, userId }, include: { scenario: true } });
    if (!decision || decision.scenario.sessionId !== sessionId) return null;
    const createdScenario = await tx.trainingScenario.create({ data: { ...scenario, sessionId } });
    const updatedSession = await tx.trainingSession.update({ where: { id: sessionId }, data: { currentScenarioId: createdScenario.id }, include: { currentScenario: true } });
    return { decision, session: updatedSession };
  });
}

export async function countProgress(userId: string, db = prisma) {
  const decisions = await db.trainingDecision.findMany({ where: { userId }, select: { evaluationStatus: true, category: true, selectedAction: true } });
  return decisions;
}

export async function getProgressRows(userId: string, db = prisma) {
  return db.trainingDecision.findMany({ where: { userId }, select: { evaluationStatus: true, category: true, selectedAction: true } });
}

export async function persistTrainerEvaluationSnapshot(userId: string, snapshot: EvaluationSnapshot, db = prisma): Promise<void> {
  await insertEvaluationSnapshot(snapshot, userId, db);
}
