import type { HandState, Pot } from './types.js';

// General main-pot/side-pot algorithm (data-model.md Pot): sort distinct contribution
// levels among seats still in the hand, and build one pot per level, capped at that level,
// contested by every seat that contributed at least that much and did not fold.
export function computePots(hand: HandState): Pot[] {
  const contributors = hand.seats.filter((s) => s.totalContribution > 0);
  if (contributors.length === 0) {
    return [];
  }

  const levels = Array.from(new Set(contributors.map((s) => s.totalContribution))).sort((a, b) => a - b);

  const pots: Pot[] = [];
  let previousLevel = 0;

  for (const level of levels) {
    const layerSize = level - previousLevel;
    if (layerSize <= 0) {
      continue;
    }
    // Everyone who contributed at least up to this level pays into this layer.
    const payers = contributors.filter((s) => s.totalContribution >= level);
    const amount = layerSize * payers.length;
    // Only non-folded seats that reached this level are eligible to win it.
    const eligibleSeats = payers.filter((s) => !s.folded).map((s) => s.seatNumber);

    if (amount > 0 && eligibleSeats.length > 0) {
      pots.push({ amount, eligibleSeats, winners: null });
    }
    previousLevel = level;
  }

  return pots;
}
