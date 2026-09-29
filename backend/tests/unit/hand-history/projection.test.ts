import { describe, expect, it } from 'vitest';
import { projectSummary } from '../../../src/modules/hand-history/hand-history.projection.js';

describe('hand history projection', () => {
	it('keeps summaries limited to public fields', () => {
		const summary = projectSummary({ id: 'h', sourceType: 'TRAINER', format: 'TEST', status: 'COMPLETED', startedAt: new Date(0), endedAt: new Date(1), publicSnapshot: { board: [], rawDeck: ['As'] }, participants: [] });
		expect(summary).not.toHaveProperty('rawDeck');
		expect(summary.summary.board).toEqual([]);
	});
});