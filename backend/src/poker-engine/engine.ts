import { randomUUID } from 'node:crypto';
import type { HandState, Seat, BettingRound, Action } from './types.js';
import { createDeck, shuffle, dealHoleCards, dealCommunityCards } from './deck.js';
import { createRng } from './rng.js';
import { applyAction } from './betting.js';
import { computePots } from './pots.js';
import { evaluate7CardHand, compareHandRanks } from './hand-evaluator.js';

const SMALL_BLIND_CHIPS = 1;
const BIG_BLIND_CHIPS = 2;
// 1 BB = 2 chip units, so the small blind (0.5 BB) is a clean integer (1 unit).
const CHIPS_PER_BB = 2;
const STREET_ORDER: BettingRound[] = ['preflop', 'flop', 'turn', 'river'];

function findActiveSeatAfter(seats: Seat[], fromSeatNumber: number): number | null {
  const n = seats.length;
  const idx0 = seats.findIndex((s) => s.seatNumber === fromSeatNumber);
  let idx = idx0;
  for (let step = 1; step <= n; step++) {
    idx = (idx + 1) % n;
    if (!seats[idx].folded && !seats[idx].isAllIn) {
      return seats[idx].seatNumber;
    }
  }
  return null;
}

function postBlind(seat: Seat, amount: number): number {
  const posted = Math.min(amount, seat.stack);
  seat.stack -= posted;
  seat.streetContribution += posted;
  seat.totalContribution += posted;
  if (seat.stack === 0) {
    seat.isAllIn = true;
  }
  return posted;
}

export function startHand(
  ownerUserId: string,
  seatCount: number,
  startingStackBB: number,
  rngSeed?: number,
  startingStacks?: number[],
  dealerSeatOverride?: number
): HandState {
  const startingStack = startingStackBB * CHIPS_PER_BB;
  const seats: Seat[] = Array.from({ length: seatCount }, (_, i) => ({
    seatNumber: i + 1,
    stack: startingStacks?.[i] ?? startingStack,
    holeCards: null,
    folded: startingStacks !== undefined && (startingStacks[i] ?? 0) === 0,
    isAllIn: false,
    streetContribution: 0,
    totalContribution: 0,
    actedThisStreet: false
  }));

  const rng = createRng(rngSeed);
  const deck = shuffle(createDeck(), rng);
  dealHoleCards(seats, deck);

  const dealerSeat = dealerSeatOverride ?? 1;
  let smallBlindSeat: number;
  let bigBlindSeat: number;
  let firstToActPreflop: number;

  if (seatCount === 2) {
    // Heads-up: dealer posts SB and acts first preflop; the other seat posts BB.
    smallBlindSeat = dealerSeat;
    bigBlindSeat = findActiveSeatAfter(seats, dealerSeat)!;
    firstToActPreflop = dealerSeat;
  } else {
    smallBlindSeat = findActiveSeatAfter(seats, dealerSeat)!;
    bigBlindSeat = findActiveSeatAfter(seats, smallBlindSeat)!;
    firstToActPreflop = findActiveSeatAfter(seats, bigBlindSeat)!;
  }

  const sbSeat = seats.find((s) => s.seatNumber === smallBlindSeat)!;
  const bbSeat = seats.find((s) => s.seatNumber === bigBlindSeat)!;
  postBlind(sbSeat, SMALL_BLIND_CHIPS);
  const bbPosted = postBlind(bbSeat, BIG_BLIND_CHIPS);

  return {
    id: randomUUID(),
    ownerUserId,
    seats,
    dealerSeat,
    smallBlindSeat,
    bigBlindSeat,
    deck,
    communityCards: [],
    bettingRound: 'preflop',
    currentBet: bbPosted,
    minRaiseIncrement: BIG_BLIND_CHIPS,
    seatToAct: firstToActPreflop,
    pots: [],
    actionHistory: [],
    result: null
  };
}

function isRoundComplete(hand: HandState): boolean {
  const contenders = hand.seats.filter((s) => !s.folded && !s.isAllIn);
  if (contenders.length === 0) return true;
  return contenders.every((s) => s.actedThisStreet && s.streetContribution === hand.currentBet);
}

function resetForNextStreet(hand: HandState): void {
  hand.currentBet = 0;
  hand.minRaiseIncrement = BIG_BLIND_CHIPS;
  for (const seat of hand.seats) {
    seat.streetContribution = 0;
    seat.actedThisStreet = false;
  }
}

function orderByProximityToDealer(seatNumbers: number[], dealerSeat: number, totalSeats: number): number[] {
  return [...seatNumbers].sort((a, b) => {
    const distA = (((a - dealerSeat - 1) % totalSeats) + totalSeats) % totalSeats;
    const distB = (((b - dealerSeat - 1) % totalSeats) + totalSeats) % totalSeats;
    return distA - distB;
  });
}

function awardPot(hand: HandState, amount: number, winners: number[]): void {
  const ordered = orderByProximityToDealer(winners, hand.dealerSeat, hand.seats.length);
  const base = Math.floor(amount / ordered.length);
  const remainder = amount % ordered.length;
  ordered.forEach((seatNumber, i) => {
    const seat = hand.seats.find((s) => s.seatNumber === seatNumber)!;
    seat.stack += base + (i < remainder ? 1 : 0);
  });
}

function awardWithoutShowdown(hand: HandState, winner: Seat): void {
  const amount = hand.seats.reduce((sum, s) => sum + s.totalContribution, 0);
  const pot = { amount, eligibleSeats: [winner.seatNumber], winners: [winner.seatNumber] };
  awardPot(hand, amount, [winner.seatNumber]);
  hand.pots = [pot];
  hand.result = { potsAwarded: [pot], revealedSeats: [], handRanks: {} };
  hand.bettingRound = 'complete';
  hand.seatToAct = null;
}

export function resolveShowdown(hand: HandState): void {
  const pots = computePots(hand);
  const rankCache = new Map<number, number[]>();
  const rankOf = (seatNumber: number) => {
    if (!rankCache.has(seatNumber)) {
      const seat = hand.seats.find((s) => s.seatNumber === seatNumber)!;
      rankCache.set(seatNumber, evaluate7CardHand(seat.holeCards!, hand.communityCards));
    }
    return rankCache.get(seatNumber)!;
  };

  for (const pot of pots) {
    let bestRank: number[] | null = null;
    let winners: number[] = [];
    for (const seatNumber of pot.eligibleSeats) {
      const rank = rankOf(seatNumber);
      if (!bestRank || compareHandRanks(rank, bestRank) > 0) {
        bestRank = rank;
        winners = [seatNumber];
      } else if (compareHandRanks(rank, bestRank) === 0) {
        winners.push(seatNumber);
      }
    }
    pot.winners = winners;
    awardPot(hand, pot.amount, winners);
  }

  hand.pots = pots;
  const handRanks: Record<number, number[]> = {};
  for (const [seatNumber, rank] of rankCache) {
    handRanks[seatNumber] = rank;
  }
  hand.result = {
    potsAwarded: pots,
    revealedSeats: hand.seats.filter((s) => !s.folded).map((s) => s.seatNumber),
    handRanks
  };
  hand.bettingRound = 'complete';
  hand.seatToAct = null;
}

function dealRemainingStreetsAndShowdown(hand: HandState): void {
  if (hand.communityCards.length < 3) {
    hand.communityCards.push(...dealCommunityCards(3 - hand.communityCards.length, hand.deck));
  }
  if (hand.communityCards.length < 4) {
    hand.communityCards.push(...dealCommunityCards(1, hand.deck));
  }
  if (hand.communityCards.length < 5) {
    hand.communityCards.push(...dealCommunityCards(1, hand.deck));
  }
  resolveShowdown(hand);
}

function advanceToNextStreet(hand: HandState): void {
  const idx = STREET_ORDER.indexOf(hand.bettingRound as (typeof STREET_ORDER)[number]);
  const next = STREET_ORDER[idx + 1];
  const dealCount = next === 'flop' ? 3 : 1;
  hand.communityCards.push(...dealCommunityCards(dealCount, hand.deck));
  hand.bettingRound = next;
  hand.seatToAct = findActiveSeatAfter(hand.seats, hand.dealerSeat);
}

function advance(hand: HandState): void {
  const nonFolded = hand.seats.filter((s) => !s.folded);
  if (nonFolded.length === 1) {
    awardWithoutShowdown(hand, nonFolded[0]);
    return;
  }

  if (!isRoundComplete(hand)) {
    hand.seatToAct = findActiveSeatAfter(hand.seats, hand.seatToAct!);
    return;
  }

  const stillToAct = nonFolded.filter((s) => !s.isAllIn);
  resetForNextStreet(hand);

  if (hand.bettingRound === 'river') {
    resolveShowdown(hand);
    return;
  }

  // FR-011: once at most one seat could still act, no more betting is possible this hand.
  if (stillToAct.length <= 1) {
    dealRemainingStreetsAndShowdown(hand);
    return;
  }

  advanceToNextStreet(hand);
}

export function submitAction(hand: HandState, action: Action): void {
  applyAction(hand, action);
  advance(hand);
}
