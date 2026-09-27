import { describe, expect, it } from 'vitest';
import { generateScenario } from '../../src/modules/trainer/trainer.generator.js';
import { projectScenario } from '../../src/modules/trainer/trainer.projection.js';

describe('trainer projection', () => {
  it('exposes only the player projection and never the engine snapshot', () => {
    const generated = generateScenario('user-1', 606006);
    const seat = generated.hand.seats.find((item) => item.seatNumber === generated.hand.seatToAct)!;
    const projected = projectScenario({
      id: 'scenario-1', sequence: 1, position: generated.position, effectiveStackBB: 100,
      holeCards: seat.holeCards, blindContext: { smallBlind: 1, bigBlind: 2 },
      priorActions: generated.hand.actionHistory, legalActions: generated.legalActions, strategyVersion: null
    });
    expect(projected).not.toHaveProperty('engineSnapshot');
    expect(projected).not.toHaveProperty('deck');
    expect(projected.holeCards).toHaveLength(2);
    expect(projected.strategyAvailable).toBe(false);
  });
});
