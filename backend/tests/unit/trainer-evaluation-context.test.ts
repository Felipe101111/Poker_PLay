import { describe, expect, it } from 'vitest';
import { startHand } from '../../src/poker-engine/engine.js';
import { evaluationContextFromScenario } from '../../src/modules/trainer/trainer.evaluation-context.js';

describe('trainer evaluation context', () => {
  it('derives authorized inputs without accepting client engine state', () => {
    const hand = startHand('user-1', 2, 100, 42);
    const hero = hand.seats.find((seat) => seat.seatNumber === hand.seatToAct)!;
    const context = evaluationContextFromScenario({ engineSnapshot: hand, holeCards: hero.holeCards, position: 'BTN', tableSize: 2, effectiveStackBB: 100, priorActions: hand.actionHistory, strategyVersion: 'preflop-v1' });
    expect(context.gameFormat).toBe('SIX_MAX_100BB_PREFLOP');
    expect(context.heroCards).toEqual(hero.holeCards);
    expect(context.calculationConfig.method).toBe('EXACT');
  });
});
