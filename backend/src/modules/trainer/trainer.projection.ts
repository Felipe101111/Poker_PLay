import type { TrainerDecisionView, TrainerScenarioView } from './trainer.types.js';

export function projectScenario(input: {
  id: string;
  sequence: number;
  position: string;
  effectiveStackBB: number;
  holeCards: unknown;
  blindContext: unknown;
  priorActions: unknown;
  legalActions: unknown;
  strategyVersion: string | null;
}): TrainerScenarioView {
  const legal = input.legalActions as {
    actions: TrainerScenarioView['legalActions']['actions'];
    callAmountBB?: number | null;
    minBetOrRaiseBB?: number | null;
    maxBetOrRaiseBB?: number | null;
    callAmount?: number | null;
    minBetOrRaise?: number | null;
    maxBetOrRaise?: number | null;
  };
  const toBB = (value: number | null | undefined, alreadyBB = false) => value === null || value === undefined ? null : alreadyBB ? value : value / 2;
  return {
    id: input.id,
    sequence: input.sequence,
    tableSize: 6,
    position: input.position,
    effectiveStackBB: input.effectiveStackBB,
    holeCards: input.holeCards as TrainerScenarioView['holeCards'],
    blindContext: input.blindContext as TrainerScenarioView['blindContext'],
    priorActions: input.priorActions as TrainerScenarioView['priorActions'],
    legalActions: {
      actions: legal.actions,
      callAmountBB: toBB(legal.callAmountBB ?? legal.callAmount, legal.callAmountBB !== undefined),
      minBetOrRaiseBB: toBB(legal.minBetOrRaiseBB ?? legal.minBetOrRaise, legal.minBetOrRaiseBB !== undefined),
      maxBetOrRaiseBB: toBB(legal.maxBetOrRaiseBB ?? legal.maxBetOrRaise, legal.maxBetOrRaiseBB !== undefined)
    },
    strategyAvailable: input.strategyVersion !== null,
    strategyVersion: input.strategyVersion
  };
}

export function projectDecision(input: any): TrainerDecisionView {
  const explanation = input.explanationSnapshot as { factors?: string[]; assumptions?: string[] };
  return {
    id: input.id,
    scenarioId: input.scenarioId,
    selectedAction: input.selectedAction,
    evaluationStatus: input.evaluationStatus,
    category: input.category,
    recommendations: input.recommendationSnapshot,
    explanation: { factors: explanation.factors ?? [], assumptions: explanation.assumptions ?? [] }
  };
}
