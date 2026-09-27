import { describe, expect, it } from 'vitest';
import { decisionSchema, startSessionSchema } from '../../src/modules/trainer/trainer.validation.js';

describe('trainer validation', () => {
  it('accepts the default session and rejects malformed action amounts', () => {
    expect(startSessionSchema.safeParse({}).success).toBe(true);
    expect(decisionSchema.safeParse({ scenarioId: 'not-uuid', requestId: 'x', action: { type: 'raise' } }).success).toBe(false);
  });
});
