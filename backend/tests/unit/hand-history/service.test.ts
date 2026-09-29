import { describe, expect, it } from 'vitest';
import { handHistoryService } from '../../../src/modules/hand-history/hand-history.service.js';

describe('hand history service boundary', () => {
  it('rejects snapshots whose terminal time precedes their start', async () => {
    await expect(handHistoryService.publish({ sourceType: 'TRAINER', sourceId: 'invalid', status: 'COMPLETED', format: 'TEST', startedAt: '2026-09-28T12:00:00.000Z', endedAt: '2026-09-28T11:59:00.000Z', publicSnapshot: {}, participants: [], actions: [] })).rejects.toMatchObject({ code: 'HAND_HISTORY_NOT_TERMINAL' });
  });
});