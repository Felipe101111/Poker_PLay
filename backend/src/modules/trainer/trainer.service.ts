import { prisma } from '../../db/prisma/client.js';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../shared/errors.js';
import { generateScenario } from './trainer.generator.js';
import { classifyAction, lookupStrategy } from './trainer.strategy.js';
import { findSessionByUser, getDecisionForUser } from './trainer.repository.js';
import type { DecisionInput, NextScenarioInput } from './trainer.validation.js';
import { toActionAmountChips, type TrainerSessionResponse } from './trainer.types.js';
import { projectDecision, projectScenario } from './trainer.projection.js';

function fail(status: number, code: ConstructorParameters<typeof ApiError>[1], message: string): never { throw new ApiError(status, code, message); }

export const trainerService = {
  async startOrResume(userId: string): Promise<TrainerSessionResponse> {
    const existing = await findSessionByUser(userId);
    if (existing) return toResponse(existing);
    const generated = generateScenario(userId);
    const strategy = lookupStrategy(generated.strategyKey);
    const created = await prisma.$transaction(async (tx) => {
      const session = await tx.trainingSession.create({ data: { userId, format: 'SIX_MAX_100BB_PREFLOP' } });
      const scenario = await tx.trainingScenario.create({ data: { ...scenarioData(generated, strategy?.version ?? null), sessionId: session.id } });
      return tx.trainingSession.update({ where: { id: session.id }, data: { currentScenarioId: scenario.id }, include: { currentScenario: true } });
    });
    return toResponse(created);
  },

  async current(userId: string): Promise<TrainerSessionResponse> {
    const session = await findSessionByUser(userId);
    if (!session) fail(404, 'TRAINING_SESSION_NOT_FOUND', 'No active training session');
    return toResponse(session);
  },

  async decide(userId: string, input: DecisionInput) {
    const session = await findSessionByUser(userId);
    if (!session?.currentScenario) fail(404, 'SCENARIO_NOT_FOUND', 'No active training scenario');
    const scenario = session.currentScenario;
    if (scenario.id !== input.scenarioId) fail(403, 'TRAINING_ACCESS_DENIED', 'Scenario does not belong to the active session');
    const existing = await getDecisionForUser(scenario.id, userId);
    if (existing) return { decision: projectDecision(existing), duplicate: true };
    const hand = scenario.engineSnapshot as never;
    const seat = (hand as { seatToAct: number | null }).seatToAct;
    const legal = scenario.legalActions as { actions: string[]; minBetOrRaise: number | null; maxBetOrRaise: number | null; callAmount: number | null };
    const amount = toActionAmountChips(input.action);
    if (!legal.actions.includes(input.action.type) || ((input.action.type === 'bet' || input.action.type === 'raise') && (amount === null || amount < (legal.minBetOrRaise ?? 0) || amount > (legal.maxBetOrRaise ?? Infinity)))) {
      fail(409, 'ILLEGAL_TRAINING_ACTION', `Action is not legal for seat ${seat}`);
    }
    const strategy = lookupStrategy(scenario.strategyKey);
    const category = strategy ? classifyAction(strategy, input.action) : null;
    try {
      const decision = await prisma.trainingDecision.create({
        data: {
          scenarioId: scenario.id,
          userId,
          requestId: input.requestId,
          selectedAction: input.action,
          evaluationStatus: strategy ? 'EVALUATED' : 'UNAVAILABLE',
          category,
          recommendationSnapshot: strategy ? strategy.actions as unknown as Prisma.InputJsonValue : undefined,
          explanationSnapshot: { factors: strategy?.factors ?? ['Strategy data unavailable'], assumptions: strategy?.assumptions ?? [] } as unknown as Prisma.InputJsonValue,
          strategyVersion: strategy?.version
        }
      });
      return { decision: projectDecision(decision), duplicate: false };
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
      const duplicate = await getDecisionForUser(scenario.id, userId);
      if (!duplicate) throw error;
      return { decision: projectDecision(duplicate), duplicate: true };
    }
  },

  async progress(userId: string) {
    const rows = await prisma.trainingDecision.findMany({ where: { userId }, select: { evaluationStatus: true, category: true, selectedAction: true } });
    const result = { completedDecisions: rows.length, preferred: 0, acceptableMixed: 0, marginal: 0, significantDeviation: 0, unavailable: 0, byAction: {} as Record<string, number>, empty: rows.length === 0 };
    for (const row of rows) {
      const action = (row.selectedAction as { type: string }).type;
      result.byAction[action] = (result.byAction[action] ?? 0) + 1;
      if (row.evaluationStatus === 'UNAVAILABLE') result.unavailable++;
      if (row.category === 'PREFERRED') result.preferred++;
      if (row.category === 'ACCEPTABLE_MIXED') result.acceptableMixed++;
      if (row.category === 'MARGINAL') result.marginal++;
      if (row.category === 'SIGNIFICANT_DEVIATION') result.significantDeviation++;
    }
    return { progress: result };
  },

  async next(userId: string, input: NextScenarioInput) {
    const session = await findSessionByUser(userId);
    if (!session?.currentScenario) fail(404, 'SCENARIO_NOT_FOUND', 'No active training scenario');
    const decision = await getDecisionForUser(session.currentScenario.id, userId);
    if (!decision || decision.id !== input.decisionId) fail(409, 'VALIDATION_ERROR', 'Complete the current scenario first');
    const generated = generateScenario(userId);
    const strategy = lookupStrategy(generated.strategyKey);
    const created = await prisma.$transaction(async (tx) => {
      const scenario = await tx.trainingScenario.create({ data: { ...scenarioData(generated, strategy?.version ?? null), sessionId: session.id, sequence: session.scenarios.length + 1 } });
      return tx.trainingSession.update({ where: { id: session.id }, data: { currentScenarioId: scenario.id }, include: { currentScenario: true } });
    });
    return { decision: projectDecision(decision), ...toResponse(created) };
  }
};

function scenarioData(generated: ReturnType<typeof generateScenario>, strategyVersion: string | null) {
  const seat = generated.hand.seats.find((item) => item.seatNumber === generated.hand.seatToAct)!;
  return {
    sequence: 1,
    generationSeed: generated.seed,
    engineSnapshot: generated.hand as unknown as Prisma.InputJsonValue,
    holeCards: seat.holeCards as unknown as Prisma.InputJsonValue,
    position: generated.position,
    tableSize: 6,
    effectiveStackBB: 100,
    blindContext: { smallBlind: 1, bigBlind: 2 } as unknown as Prisma.InputJsonValue,
    priorActions: generated.hand.actionHistory as unknown as Prisma.InputJsonValue,
    legalActions: generated.hand.seatToAct === null ? {} as Prisma.InputJsonValue : generated.legalActions as unknown as Prisma.InputJsonValue,
    strategyKey: generated.strategyKey,
    strategyVersion
  };
}

function toResponse(session: { id: string; status: string; format: string; currentScenario?: any; scenarios?: any[] }): TrainerSessionResponse {
  const currentScenario = session.currentScenario;
  const latestDecision = session.scenarios?.flatMap((scenario) => scenario.decisions ?? [])[0];
  return {
    session: { id: session.id, status: session.status as 'ACTIVE' | 'COMPLETED', format: 'SIX_MAX_100BB_PREFLOP' },
    scenario: currentScenario ? projectScenario(currentScenario) : null,
    latestDecision: latestDecision ? projectDecision(latestDecision) : null
  };
}
