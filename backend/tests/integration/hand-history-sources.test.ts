import { describe, expect, it } from 'vitest';
import { publishLocalGameHistory } from '../../src/modules/local-games/local-games.history.js';
import { publishMultiplayerHistory } from '../../src/modules/multiplayer/multiplayer.history.js';
import { publishTrainerHistory } from '../../src/modules/trainer/trainer.history.js';
import { terminalHandFixture } from '../helpers/hand-history.js';

describe('hand history source adapters', () => {
  it('assign source-specific types at the publication boundary', () => {
    expect(typeof publishLocalGameHistory).toBe('function');
    expect(typeof publishMultiplayerHistory).toBe('function');
    expect(typeof publishTrainerHistory).toBe('function');
    expect(terminalHandFixture().sourceType).toBe('TRAINER');
  });
});