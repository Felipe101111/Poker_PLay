import { createDeck } from '../../poker-engine/deck.js';
import { compareHandRanks, evaluate7CardHand } from '../../poker-engine/hand-evaluator.js';
import type { Card } from '../../poker-engine/types.js';
import type { Combo, EquityAnalysisRequest, EquityAnalysisResult, EquityParticipant } from './equity.types.js';
import { cardKey, validateEquityRequest } from './equity.validation.js';
import { normalizedInputFingerprint } from './equity.fingerprint.js';
import { assertPrecision, roundToPrecision } from './equity.precision.js';
import { filterBlockedCombos } from './range.service.js';
import { ApiError } from '../../shared/errors.js';

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  return [...combinations(rest, size - 1).map((item) => [first, ...item]), ...combinations(rest, size)];
}

function cartesian<T>(sets: T[][]): T[][] {
  return sets.reduce<T[][]>((result, set) => result.flatMap((prefix) => set.map((item) => [...prefix, item])), [[]]);
}

function withoutKnownCards(deck: Card[], known: Set<string>): Card[] {
  return deck.filter((card) => !known.has(cardKey(card)));
}

function participantCombos(participant: EquityParticipant): Combo[] {
  return participant.holding ? [{ cards: participant.holding.cards, weight: 1 }] : participant.range?.combos ?? [];
}

export function calculateEquity(rawRequest: unknown): EquityAnalysisResult {
  const request = validateEquityRequest(rawRequest);
  assertPrecision(request.precision);
  const knownBoard = new Set(request.board.map(cardKey));
  const normalizedParticipants = request.participants.map((participant) => {
    const combos = participantCombos(participant);
    const filtered = filterBlockedCombos({ label: participant.id, combos }, request.board);
    if (!filtered.combos.length) throw new ApiError(400, 'EMPTY_RANGE', `Participant ${participant.id} has no active combos`);
    return { participant, combos: filtered.combos, blocked: filtered.removedComboCount, remainingWeight: filtered.remainingWeight };
  });
  const blockedCards = new Set(request.board.map(cardKey));
  let blockedComboCount = 0;
  const remainingWeight: Record<string, number> = {};
  for (const item of normalizedParticipants) {
    blockedComboCount += item.blocked;
    remainingWeight[item.participant.id] = item.remainingWeight;
  }
  let wins = request.participants.map(() => 0);
  let equity = request.participants.map(() => 0);
  let ties = 0;
  let runoutsEvaluated = 0;
  const comboSelections = cartesian(normalizedParticipants.map((item) => item.combos));
  for (const selection of comboSelections) {
    const selectedCards = selection.flatMap((combo) => combo.cards);
    const selectedKeys = selectedCards.map(cardKey);
    if (new Set(selectedKeys).size !== selectedKeys.length) continue;
    const known = new Set([...blockedCards, ...selectedKeys]);
    const remainingDeck = withoutKnownCards(createDeck(), known);
    const cardsToComplete = 5 - request.board.length;
    for (const runout of combinations(remainingDeck, cardsToComplete)) {
      runoutsEvaluated++;
      const community = [...request.board, ...runout];
      const ranks = selection.map((combo) => evaluate7CardHand(combo.cards, community));
      const best = ranks.reduce((current, rank) => compareHandRanks(rank, current) > 0 ? rank : current, ranks[0]);
      const winners = ranks.map((rank, index) => compareHandRanks(rank, best) === 0 ? index : -1).filter((index) => index >= 0);
      const weight = selection.reduce((total, combo) => total * combo.weight, 1);
      if (winners.length > 1) ties += weight;
      winners.forEach((winner) => { wins[winner] += weight; equity[winner] += weight / winners.length; });
    }
  }
  if (!runoutsEvaluated) throw new ApiError(400, 'EMPTY_RANGE', 'No legal runouts remain after blockers');
  const totalWeight = normalizedParticipants.reduce((total, item) => total * item.combos.reduce((sum, combo) => sum + combo.weight, 0), 1);
  return {
    method: 'EXACT', precision: request.precision, runoutsEvaluated,
    participants: request.participants.map((participant, index) => ({ id: participant.id, winProbability: roundToPrecision(wins[index] / (totalWeight * runoutsEvaluated), request.precision), equity: roundToPrecision(equity[index] / (totalWeight * runoutsEvaluated), request.precision) })),
    tieProbability: roundToPrecision(ties / (totalWeight * runoutsEvaluated), request.precision),
    blockedComboCount, remainingWeight, inputFingerprint: normalizedInputFingerprint(request)
  };
}
