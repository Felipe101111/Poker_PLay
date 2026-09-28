import type { Card, Rank, Suit, Combo } from './equity.types.js';
import { canonicalCombo } from './range.combos.js';
import { ApiError } from '../../shared/errors.js';

const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const suits: Suit[] = ['s', 'h', 'd', 'c'];

export function expandRangeNotation(notation: string, weight = 1): Combo[] {
  const value = notation.trim();
  const match = /^([2-9TJQKA])([2-9TJQKA])([so])?$/.exec(value);
  if (!match) throw new ApiError(400, 'INVALID_RANGE', `Unsupported range notation: ${notation}`);
  const first = match[1] as Rank;
  const second = match[2] as Rank;
  const suffix = match[3];
  const combos: Combo[] = [];
  if (first === second) {
    for (let firstSuit = 0; firstSuit < suits.length; firstSuit++) {
      for (let secondSuit = firstSuit + 1; secondSuit < suits.length; secondSuit++) {
        combos.push(canonicalCombo([{ rank: first, suit: suits[firstSuit] }, { rank: second, suit: suits[secondSuit] }], weight));
      }
    }
    return combos;
  }
  for (const firstSuit of suits) {
    for (const secondSuit of suits) {
      const suited = firstSuit === secondSuit;
      if ((suffix === 's' && !suited) || (suffix === 'o' && suited)) continue;
      combos.push(canonicalCombo([{ rank: first, suit: firstSuit }, { rank: second, suit: secondSuit }], weight));
    }
  }
  if (!combos.length || !ranks.includes(first) || !ranks.includes(second)) throw new ApiError(400, 'INVALID_RANGE', `Unsupported range notation: ${notation}`);
  return combos;
}
