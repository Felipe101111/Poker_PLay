import { randomInt } from 'node:crypto';
import { computeLegalActions } from '../../poker-engine/betting.js';
import { startHand, submitAction } from '../../poker-engine/engine.js';
import type { HandState } from '../../poker-engine/types.js';
import { POSTFLOP_TRAINER_FORMAT, type LegalActionsView, type TrainerStreet } from './trainer.types.js';
import { positionForSeat } from './trainer.generator.js';

export interface GeneratedPostflopScenario {
  seed: number;
  hand: HandState;
  street: TrainerStreet;
  position: string;
  legalActions: LegalActionsView;
  strategyKey: string;
}

function legalActionsView(hand: HandState): LegalActionsView {
  const legal = computeLegalActions(hand);
  if (!legal) throw new Error('Generated postflop scenario has no legal actions');
  return {
    actions: legal.actions,
    callAmountBB: legal.callAmount === null ? null : legal.callAmount / 2,
    minBetOrRaiseBB: legal.minBetOrRaise === null ? null : legal.minBetOrRaise / 2,
    maxBetOrRaiseBB: legal.maxBetOrRaise === null ? null : legal.maxBetOrRaise / 2
  };
}

function replayToFlop(hand: HandState): void {
  while (hand.bettingRound === 'preflop' && hand.seatToAct !== null) {
    const legal = computeLegalActions(hand);
    if (!legal) throw new Error('Preflop replay has no legal action');
    const type = legal.callAmount !== null ? 'call' : 'check';
    submitAction(hand, { seatNumber: hand.seatToAct, type, amount: null, bettingRound: 'preflop' });
  }
}

function settleStreetAfterHeroAction(hand: HandState, heroSeat: number, street: 'flop' | 'turn'): void {
  while (hand.seatToAct !== null && hand.bettingRound === street) {
    const legal = computeLegalActions(hand);
    if (!legal) return;
    const type = legal.callAmount !== null ? 'call' : 'check';
    submitAction(hand, { seatNumber: hand.seatToAct, type, amount: null, bettingRound: hand.bettingRound });
    if (hand.seatToAct === heroSeat) continue;
  }
}

export function generatePostflopScenario(ownerUserId: string, seed = randomInt(1, 2_147_483_647)): GeneratedPostflopScenario {
  const hand = startHand(ownerUserId, 6, 100, seed);
  replayToFlop(hand);
  if (hand.bettingRound !== 'flop' || hand.communityCards.length !== 3 || hand.seatToAct === null) {
    throw new Error('Generated postflop scenario did not reach a decision-ready flop');
  }
  const position = positionForSeat(hand.seatToAct);
  return {
    seed,
    hand,
    street: 'flop',
    position,
    legalActions: legalActionsView(hand),
    strategyKey: `flop:${POSTFLOP_TRAINER_FORMAT}:${position}:100bb:checked-to-hero`
  };
}

export function continuePostflopScenario(handSnapshot: HandState, action: Parameters<typeof submitAction>[1]): GeneratedPostflopScenario | null {
  const hand = structuredClone(handSnapshot);
  if (hand.seatToAct === null || !['flop', 'turn'].includes(hand.bettingRound)) return null;
  const heroSeat = hand.seatToAct;
  submitAction(hand, action);
  if (action.type === 'fold') return null;
  settleStreetAfterHeroAction(hand, heroSeat, handSnapshot.bettingRound as 'flop' | 'turn');
  if (hand.bettingRound === 'complete' || hand.bettingRound === 'showdown' || hand.seatToAct === null) return null;
  const street = hand.bettingRound as TrainerStreet;
  if ((street === 'turn' && hand.communityCards.length !== 4) || (street === 'river' && hand.communityCards.length !== 5)) return null;
  const position = positionForSeat(hand.seatToAct);
  return {
    seed: 0,
    hand,
    street,
    position,
    legalActions: legalActionsView(hand),
    strategyKey: `${street}:${POSTFLOP_TRAINER_FORMAT}:${position}:100bb:checked-to-hero`
  };
}
