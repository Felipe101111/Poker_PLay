import { randomUUID } from 'node:crypto';
import { generateScenario } from '../../src/modules/trainer/trainer.generator.js';

export function trainerUserId() { return randomUUID(); }
export function deterministicTrainerScenario(userId = trainerUserId(), seed = 606006) { return generateScenario(userId, seed); }
export const supportedTrainerStrategyKey = 'SIX_MAX_100BB_PREFLOP:BTN';
export const unsupportedTrainerStrategyKey = 'SIX_MAX_100BB_PREFLOP:UTG';
