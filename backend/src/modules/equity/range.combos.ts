import type { Card, Combo } from './equity.types.js';
import { cardKey } from './equity.validation.js';
import { ApiError } from '../../shared/errors.js';

export function canonicalCombo(cards: [Card, Card], weight = 1): Combo {
  if (cardKey(cards[0]) === cardKey(cards[1])) throw new ApiError(400, 'INVALID_RANGE', 'Combo cards must be distinct');
  const ordered = [cards[0], cards[1]].sort((left, right) => cardKey(left).localeCompare(cardKey(right))) as [Card, Card];
  if (!Number.isFinite(weight) || weight < 0 || weight > 1) throw new ApiError(400, 'INVALID_RANGE', 'Combo weight must be between 0 and 1');
  return { cards: ordered, weight, sourceWeight: weight };
}

export function assertUniqueCombos(combos: Combo[]): void {
  const keys = combos.map((combo) => combo.cards.map(cardKey).join('-'));
  if (new Set(keys).size !== keys.length) throw new ApiError(400, 'INVALID_RANGE', 'Duplicate combos are not allowed');
}
