import { createHash } from 'node:crypto';
import type { EquityAnalysisRequest } from './equity.types.js';
import { cardKey } from './equity.validation.js';

export function normalizedInputFingerprint(request: EquityAnalysisRequest): string {
  const normalized = {
    ...request,
    board: [...request.board].sort((a, b) => cardKey(a).localeCompare(cardKey(b))),
    participants: request.participants.map((participant) => ({
      id: participant.id,
      holding: participant.holding ? [...participant.holding.cards].sort((a, b) => cardKey(a).localeCompare(cardKey(b))) : undefined,
      range: participant.range ? { ...participant.range, combos: [...participant.range.combos].sort((a, b) => a.cards.map(cardKey).join('').localeCompare(b.cards.map(cardKey).join('')))} : undefined
    }))
  };
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}
