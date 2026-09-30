import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { ApiError } from '../../shared/errors.js';
import { generateScenario } from './trainer.generator.js';
import { continuePostflopScenario, generatePostflopScenario } from './trainer.postflop-generator.js';
import { classifyAction, lookupPostflopStrategy, lookupStrategy } from './trainer.strategy.js';
import { completePostflopSession, continueSession, createSessionWithScenario, findLatestPostflopSessionByUser, findPostflopSessionByUser, findScenarioById, findSessionByUser, getDecisionForUser, getProgressRows, insertDecisionIdempotent, markPostflopScenarioTerminal, persistTrainerEvaluationSnapshot, replaceUnsupportedCurrentScenario } from './trainer.repository.js';
import type { DecisionInput, NextScenarioInput } from './trainer.validation.js';
import { toActionAmountChips, type TrainerSessionResponse } from './trainer.types.js';
import { projectDecision, projectScenario } from './trainer.projection.js';
import { evaluationContextFromScenario } from './trainer.evaluation-context.js';
import { evaluateTrainerScenario } from './trainer.evaluation.js';

function fail(status: number, code: ConstructorParameters<typeof ApiError>[1], message: string): never { throw new ApiError(status, code, message); }

function trainerLog(event: string, fields: Record<string, string | number | boolean>): void {
  process.stdout.write(`${JSON.stringify({ scope: 'trainer', event, ...fields })}\n`);
}

async function ensureSupportedPreflopScenario(userId: string, session: NonNullable<Awaited<ReturnType<typeof findSessionByUser>>>) {
  const current = session.currentScenario;
  if (!current || lookupStrategy(current.strategyKey)) return session;
  if (await getDecisionForUser(current.id, userId)) return session;

  const generated = generateScenario(userId);
  const strategy = lookupStrategy(generated.strategyKey);
  if (!strategy) return session;
  return await replaceUnsupportedCurrentScenario(userId, current.id, scenarioData(generated, strategy.version)) ?? session;
}

export const trainerService = {
  async startOrResume(userId: string): Promise<TrainerSessionResponse> {
    const existing = await findSessionByUser(userId);
    if (existing) return toResponse(await ensureSupportedPreflopScenario(userId, existing));
    const generated = generateScenario(userId);
    const strategy = lookupStrategy(generated.strategyKey);
    const created = await createSessionWithScenario(userId, scenarioData(generated, strategy?.version ?? null));
    trainerLog('session_started', { userId, strategyAvailable: Boolean(strategy) });
    return toResponse(created);
  },

  async current(userId: string): Promise<TrainerSessionResponse> {
    const existing = await findSessionByUser(userId);
    const session = existing ? await ensureSupportedPreflopScenario(userId, existing) : null;
    if (!session) fail(404, 'TRAINING_SESSION_NOT_FOUND', 'No active training session');
    return toResponse(session);
  },

  async postflopStartOrResume(userId: string): Promise<TrainerSessionResponse> {
    const existing = await findPostflopSessionByUser(userId);
    if (existing) return toResponse(existing);
    const generated = generatePostflopScenario(userId);
    const strategy = lookupPostflopStrategy(generated.strategyKey);
    const created = await createSessionWithScenario(userId, postflopScenarioData(generated, strategy?.version ?? null), undefined, 'SIX_MAX_100BB_POSTFLOP');
    trainerLog('postflop_session_started', { userId, strategyAvailable: Boolean(strategy) });
    return toResponse(created);
  },

  async postflopCurrent(userId: string): Promise<TrainerSessionResponse> {
    const session = await findLatestPostflopSessionByUser(userId);
    if (!session) fail(404, 'TRAINING_SESSION_NOT_FOUND', 'No active postflop training session');
    return toResponse(session);
  },

  async decide(userId: string, input: DecisionInput) {
    const session = await findSessionByUser(userId);
    if (!session?.currentScenario) {
      const foreignScenario = await findScenarioById(input.scenarioId);
      if (foreignScenario && foreignScenario.session.userId !== userId) fail(403, 'TRAINING_ACCESS_DENIED', 'Scenario does not belong to the authenticated user');
      fail(404, 'SCENARIO_NOT_FOUND', 'No active training scenario');
    }
    const scenario = session.currentScenario;
    if (scenario.id !== input.scenarioId) fail(403, 'TRAINING_ACCESS_DENIED', 'Scenario does not belong to the active session');
    const existing = await getDecisionForUser(scenario.id, userId);
    if (existing) {
      trainerLog('duplicate_decision', { userId, scenarioId: scenario.id });
      return { decision: projectDecision(existing), duplicate: true };
    }
    const hand = scenario.engineSnapshot as never;
    const seat = (hand as { seatToAct: number | null }).seatToAct;
    const legal = scenario.legalActions as { actions: string[]; minBetOrRaise: number | null; maxBetOrRaise: number | null; callAmount: number | null };
    const amount = toActionAmountChips(input.action);
    if (!legal.actions.includes(input.action.type) || ((input.action.type === 'bet' || input.action.type === 'raise') && (amount === null || amount < (legal.minBetOrRaise ?? 0) || amount > (legal.maxBetOrRaise ?? Infinity)))) {
      fail(409, 'ILLEGAL_TRAINING_ACTION', `Action is not legal for seat ${seat}`);
    }
    const strategy = lookupStrategy(scenario.strategyKey);
    const evaluation = evaluateTrainerScenario(evaluationContextFromScenario({
      engineSnapshot: scenario.engineSnapshot,
      holeCards: scenario.holeCards,
      position: scenario.position,
      tableSize: scenario.tableSize,
      effectiveStackBB: scenario.effectiveStackBB,
      priorActions: scenario.priorActions,
      strategyVersion: scenario.strategyVersion
    }), () => strategy);
    const startedAt = Date.now();
    if (!strategy) trainerLog('strategy_unavailable', { userId, scenarioId: scenario.id });
    const category = strategy ? classifyAction(strategy, input.action) : null;
    const result = await insertDecisionIdempotent({
      scenarioId: scenario.id,
      userId,
      requestId: input.requestId,
      selectedAction: input.action,
      evaluationStatus: strategy ? 'EVALUATED' : 'UNAVAILABLE',
      category,
      recommendationSnapshot: strategy ? strategy.actions as unknown as Prisma.InputJsonValue : undefined,
      explanationSnapshot: { factors: strategy?.factors ?? ['Strategy data unavailable'], assumptions: strategy?.assumptions ?? [], equity: evaluation.equity, limitations: evaluation.limitations } as unknown as Prisma.InputJsonValue,
      strategyVersion: strategy?.version
    });
    trainerLog('decision_completed', { userId, scenarioId: scenario.id, latencyMs: Date.now() - startedAt, duplicate: result.duplicate });
    return { decision: projectDecision(result.decision), duplicate: result.duplicate };
  },

  async postflopDecide(userId: string, input: DecisionInput) {
    const session = await findPostflopSessionByUser(userId);
    if (!session?.currentScenario) fail(404, 'SCENARIO_NOT_FOUND', 'No active postflop training scenario');
    const scenario = session.currentScenario;
    if (scenario.id !== input.scenarioId) fail(409, 'POSTFLOP_STALE_SCENARIO', 'Scenario is no longer current');
    const existing = await getDecisionForUser(scenario.id, userId);
    if (existing) return { decision: projectDecision(existing), duplicate: true };
    const legal = scenario.legalActions as { actions: string[]; minBetOrRaise: number | null; maxBetOrRaise: number | null };
    const amount = toActionAmountChips(input.action);
    if (!legal.actions.includes(input.action.type) || ((input.action.type === 'bet' || input.action.type === 'raise') && (amount === null || amount < (legal.minBetOrRaise ?? 0) || amount > (legal.maxBetOrRaise ?? Infinity)))) {
      fail(409, 'ILLEGAL_TRAINING_ACTION', 'Action is not legal for the current postflop scenario');
    }
    const strategy = lookupPostflopStrategy(scenario.strategyKey);
    const evaluationContext = evaluationContextFromScenario({
      engineSnapshot: scenario.engineSnapshot,
      holeCards: scenario.holeCards,
      position: scenario.position,
      tableSize: scenario.tableSize,
      effectiveStackBB: scenario.effectiveStackBB,
      priorActions: scenario.priorActions,
      strategyVersion: scenario.strategyVersion,
      gameFormat: 'SIX_MAX_100BB_POSTFLOP',
      potBB: scenario.potBB ?? undefined,
      legalActions: scenario.legalActions,
      strategyKey: scenario.strategyKey
    });
    const evaluation = evaluateTrainerScenario(evaluationContext, () => strategy);
    const result = await insertDecisionIdempotent({
      scenarioId: scenario.id,
      userId,
      requestId: input.requestId,
      selectedAction: input.action,
      evaluationStatus: strategy ? 'EVALUATED' : 'UNAVAILABLE',
      category: strategy ? classifyAction(strategy, input.action) : null,
      recommendationSnapshot: strategy ? strategy.actions as unknown as Prisma.InputJsonValue : undefined,
      explanationSnapshot: { street: scenario.street?.toLowerCase(), context: { board: scenario.board, potBB: scenario.potBB, position: scenario.position, effectiveStackBB: scenario.effectiveStackBB, priorActions: scenario.priorActions }, factors: strategy?.factors ?? ['Strategy data unavailable'], assumptions: strategy?.assumptions ?? [], equity: evaluation.equity, limitations: evaluation.limitations } as unknown as Prisma.InputJsonValue,
      strategyVersion: strategy?.version
    });
    if (!result.duplicate) {
      await persistTrainerEvaluationSnapshot(userId, {
        id: randomUUID(),
        scenarioId: scenario.id,
        contextSnapshot: evaluationContext,
        equitySnapshot: evaluation.equity,
        strategyRowSnapshot: strategy as never,
        classification: strategy ? classifyAction(strategy, input.action) : undefined,
        availability: evaluation.availability,
        calculationFingerprint: evaluation.equity?.inputFingerprint,
        createdAt: new Date().toISOString()
      });
    }
    return { decision: projectDecision(result.decision), duplicate: result.duplicate };
  },

  async postflopNext(userId: string, input: NextScenarioInput) {
    const session = await findPostflopSessionByUser(userId);
    if (!session?.currentScenario) fail(404, 'SCENARIO_NOT_FOUND', 'No active postflop training scenario');
    const current = session.currentScenario;
    const decision = await getDecisionForUser(current.id, userId);
    if (!decision || decision.id !== input.decisionId) fail(409, 'POSTFLOP_STALE_SCENARIO', 'Complete the current postflop scenario first');
    const hand = current.engineSnapshot as never;
    const selected = decision.selectedAction as { type: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'; amountBB?: number };
    const next = continuePostflopScenario(hand, {
      seatNumber: (hand as { seatToAct: number }).seatToAct,
      type: selected.type,
      amount: selected.amountBB === undefined ? null : Math.round(selected.amountBB * 2),
      bettingRound: (hand as { bettingRound: 'flop' | 'turn' | 'river' }).bettingRound
    });
    if (!next) {
      await markPostflopScenarioTerminal(current.id, session.id, userId, 'COMPLETE');
      await completePostflopSession(session.id, userId);
      return { decision: projectDecision(decision), ...toResponse({ ...session, status: 'COMPLETED', currentScenario: null }) };
    }
    const generated = { ...next, seed: current.generationSeed };
    const strategy = lookupPostflopStrategy(generated.strategyKey);
    const result = await continueSession(session.id, userId, decision.id, { ...postflopScenarioData(generated, strategy?.version ?? null), sequence: current.sequence + 1 });
    if (!result) fail(409, 'POSTFLOP_STALE_SCENARIO', 'Postflop scenario changed before continuation');
    return { decision: projectDecision(result.decision), ...toResponse(result.session) };
  },

  async progress(userId: string) {
    const rows = await getProgressRows(userId);
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
    const result = await continueSession(session.id, userId, decision.id, { ...scenarioData(generated, strategy?.version ?? null), sequence: session.scenarios.length + 1 });
    if (!result) fail(409, 'VALIDATION_ERROR', 'Complete the current scenario first');
    return { decision: projectDecision(result.decision), ...toResponse(result.session) };
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

function postflopScenarioData(generated: ReturnType<typeof generatePostflopScenario>, strategyVersion: string | null) {
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
    strategyVersion,
    street: generated.street.toUpperCase() as 'FLOP',
    board: generated.hand.communityCards as unknown as Prisma.InputJsonValue,
    potBB: generated.hand.seats.reduce((total, current) => total + current.totalContribution, 0) / 2,
    terminalReason: null
  };
}

function toResponse(session: { id: string; status: string; format: string; currentScenario?: any; scenarios?: any[] }): TrainerSessionResponse {
  const currentScenario = session.currentScenario;
  const orderedScenarios = [...(session.scenarios ?? [])].sort((left, right) => left.sequence - right.sequence);
  const latestDecision = [...orderedScenarios].reverse().flatMap((scenario) => scenario.decisions ?? [])[0];
  const history = orderedScenarios.flatMap((scenario) => (scenario.decisions ?? []).map((decision: any) => projectDecision(decision)));
  return {
    session: { id: session.id, status: session.status as 'ACTIVE' | 'COMPLETED', format: session.format as TrainerSessionResponse['session']['format'] },
    scenario: currentScenario ? projectScenario(currentScenario) : null,
    latestDecision: latestDecision ? projectDecision(latestDecision) : null,
    ...(session.format === 'SIX_MAX_100BB_POSTFLOP' ? { history } : {})
  };
}
