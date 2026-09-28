import type { Card, Combo, Range, RangeFilterResult } from './equity.types.js';
import { assertUniqueCombos } from './range.combos.js';
import { cardKey } from './equity.validation.js';
import { ApiError } from '../../shared/errors.js';

export function filterBlockedCombos(range: Range, knownCards: Card[]): RangeFilterResult {
  assertUniqueCombos(range.combos);
  const blocked = new Set(knownCards.map(cardKey));
  const active = range.combos.filter((combo) => !combo.cards.some((card) => blocked.has(cardKey(card))));
  return { combos: active, removedComboCount: range.combos.length - active.length, remainingWeight: active.reduce((total, combo) => total + combo.weight, 0) };
}

export function normalizeRange(range: Range): Range {
  assertUniqueCombos(range.combos);
  const total = range.combos.reduce((sum, combo) => sum + combo.weight, 0);
  if (!Number.isFinite(total) || total <= 0) throw new ApiError(400, 'EMPTY_RANGE', 'Range has no active weight');
  return { ...range, combos: range.combos.map((combo) => ({ ...combo, sourceWeight: combo.sourceWeight ?? combo.weight, weight: combo.weight / total })), normalizationFactor: total, totalWeight: 1 };
}
