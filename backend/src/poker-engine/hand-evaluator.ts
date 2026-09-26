import type { Card } from './types.js';

const RANK_VALUES: Record<string, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14
};

// A HandRank is a comparable tuple: [category, tiebreaker1, tiebreaker2, ...].
// Higher category wins; ties within a category are broken by comparing tiebreakers left-to-right.
export type HandRank = number[];

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const [first, ...rest] = items;
  const withFirst = combinations(rest, size - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, size);
  return [...withFirst, ...withoutFirst];
}

function evaluate5(cards: Card[]): HandRank {
  const values = cards.map((c) => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const isFlush = cards.every((c) => c.suit === cards[0].suit);

  const uniqueSorted = Array.from(new Set(values)).sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;
  if (uniqueSorted.length === 5) {
    if (uniqueSorted[0] - uniqueSorted[4] === 4) {
      isStraight = true;
      straightHigh = uniqueSorted[0];
    } else if (uniqueSorted.join(',') === '14,5,4,3,2') {
      // wheel: A-2-3-4-5, Ace plays low, straight high card is 5
      isStraight = true;
      straightHigh = 5;
    }
  }

  const countByValue = new Map<number, number>();
  for (const v of values) {
    countByValue.set(v, (countByValue.get(v) ?? 0) + 1);
  }
  const groups = Array.from(countByValue.entries()).sort((a, b) => (b[1] - a[1]) || (b[0] - a[0]));
  const counts = groups.map((g) => g[1]);

  if (isStraight && isFlush) {
    return [8, straightHigh];
  }
  if (counts[0] === 4) {
    return [7, groups[0][0], groups[1][0]];
  }
  if (counts[0] === 3 && counts[1] === 2) {
    return [6, groups[0][0], groups[1][0]];
  }
  if (isFlush) {
    return [5, ...values];
  }
  if (isStraight) {
    return [4, straightHigh];
  }
  if (counts[0] === 3) {
    return [3, groups[0][0], ...groups.slice(1).map((g) => g[0])];
  }
  if (counts[0] === 2 && counts[1] === 2) {
    const pairValues = groups.filter((g) => g[1] === 2).map((g) => g[0]);
    return [2, ...pairValues, groups[2][0]];
  }
  if (counts[0] === 2) {
    return [1, groups[0][0], ...groups.slice(1).map((g) => g[0])];
  }
  return [0, ...values];
}

export function evaluate7CardHand(holeCards: [Card, Card], communityCards: Card[]): HandRank {
  const all = [...holeCards, ...communityCards];
  const best = combinations(all, 5)
    .map(evaluate5)
    .reduce((best, current) => (compareHandRanks(current, best) > 0 ? current : best));
  return best;
}

export function compareHandRanks(a: HandRank, b: HandRank): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}
