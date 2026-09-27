import { randomInt } from 'node:crypto';
import { computeLegalActions } from '../../poker-engine/betting.js';
import { startHand } from '../../poker-engine/engine.js';
import type { HandState } from '../../poker-engine/types.js';
import { TRAINER_FORMAT, type LegalActionsView } from './trainer.types.js';

export interface GeneratedScenario {
  seed: number;
  hand: HandState;
  position: string;
  legalActions: LegalActionsView;
  strategyKey: string;
}

const positions = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];

export function positionForSeat(seatNumber: number): string {
  return positions[(seatNumber - 1) % positions.length];
}

export function generateScenario(ownerUserId: string, seed = randomInt(1, 2_147_483_647)): GeneratedScenario {
  const hand = startHand(ownerUserId, 6, 100, seed);
  if (hand.bettingRound !== 'preflop' || hand.seatToAct === null) throw new Error('Generated trainer scenario is not decision-ready');
  const legal = computeLegalActions(hand);
  if (!legal) throw new Error('Generated trainer scenario has no legal actions');
  const position = positionForSeat(hand.seatToAct);
  return {
    seed,
    hand,
    position,
    legalActions: {
      actions: legal.actions,
      callAmountBB: legal.callAmount === null ? null : legal.callAmount / 2,
      minBetOrRaiseBB: legal.minBetOrRaise === null ? null : legal.minBetOrRaise / 2,
      maxBetOrRaiseBB: legal.maxBetOrRaise === null ? null : legal.maxBetOrRaise / 2
    },
    strategyKey: `${TRAINER_FORMAT}:${position}`
  };
}
