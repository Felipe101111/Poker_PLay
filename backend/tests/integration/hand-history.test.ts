import { describe, expect, it } from 'vitest';
import { terminalHandFixture } from '../helpers/hand-history.js';
import { handHistoryService } from '../../src/modules/hand-history/hand-history.service.js';

describe('hand history publication boundary', () => {
  it('rejects an active snapshot before persistence', async () => {
    await expect(handHistoryService.publish(terminalHandFixture({ endedAt: '' }))).rejects.toMatchObject({ code: 'HAND_HISTORY_NOT_TERMINAL' });
  });
});