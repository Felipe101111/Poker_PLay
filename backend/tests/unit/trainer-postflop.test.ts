import { describe, expect, it } from 'vitest';
import { deterministicPostflopHand, allHandCardsUnique } from '../helpers/trainer-postflop.js';
import { errorBody } from '../../src/shared/errors.js';
import { postflopBoardSchema, postflopDecisionSchema } from '../../src/modules/trainer/trainer.validation.js';
import { projectScenario } from '../../src/modules/trainer/trainer.projection.js';

describe('postflop foundation', () => {
  it('provides a deterministic unique-card hand fixture', () => {
    const hand = deterministicPostflopHand('user-808', 808006);
    expect(hand.bettingRound).toBe('preflop');
    expect(allHandCardsUnique(hand)).toBe(true);
  });

  it.todo('validates postflop boards and terminal metadata');

  it('accepts only unique flop, turn, or river board sizes', () => {
    const flop = [{ rank: 'A', suit: 's' }, { rank: 'K', suit: 'h' }, { rank: '2', suit: 'd' }];
    expect(postflopBoardSchema.safeParse(flop).success).toBe(true);
    expect(postflopBoardSchema.safeParse(flop.slice(0, 2)).success).toBe(false);
    expect(postflopBoardSchema.safeParse([...flop, flop[0]]).success).toBe(false);
  });

  it('rejects derived postflop fields in client decision payloads', () => {
    const result = postflopDecisionSchema.safeParse({
      scenarioId: '00000000-0000-0000-0000-000000000001',
      requestId: 'request-1',
      action: { type: 'check' },
      board: []
    });
    expect(result.success).toBe(false);
  });

  it('exposes stable postflop error codes', () => {
    expect(errorBody('POSTFLOP_TERMINAL', 'Hand is terminal')).toEqual({ error: { code: 'POSTFLOP_TERMINAL', message: 'Hand is terminal' } });
  });

  it('projects authorized board metadata without raw engine state', () => {
    const projection = projectScenario({
      id: '00000000-0000-0000-0000-000000000002',
      sequence: 1,
      position: 'BTN',
      effectiveStackBB: 100,
      holeCards: [{ rank: 'A', suit: 's' }, { rank: 'K', suit: 's' }],
      blindContext: { smallBlind: 1, bigBlind: 2 },
      priorActions: [],
      legalActions: { actions: ['check'], callAmount: null, minBetOrRaise: null, maxBetOrRaise: null },
      strategyVersion: 'postflop-v1',
      street: 'flop',
      board: [{ rank: '2', suit: 's' }, { rank: '7', suit: 'h' }, { rank: 'Q', suit: 'd' }],
      potBB: 6,
      terminalReason: null,
      deck: [{ rank: 'A', suit: 'c' }]
    } as never);
    expect(projection.street).toBe('flop');
    expect(projection.board).toHaveLength(3);
    expect(projection).not.toHaveProperty('deck');
    expect(projection).not.toHaveProperty('seats');
  });
});
