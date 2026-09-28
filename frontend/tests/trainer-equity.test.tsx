import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TrainerPage } from '../src/pages/TrainerPage';

vi.mock('../src/services/trainerApi', () => ({
  trainerApi: { current: vi.fn().mockResolvedValue({ session: { id: 's1', status: 'ACTIVE', format: 'SIX_MAX_100BB_PREFLOP' }, scenario: { id: 'sc1', sequence: 1, tableSize: 6, position: 'BTN', effectiveStackBB: 100, holeCards: [{ rank: 'A', suit: 's' }, { rank: 'K', suit: 's' }], blindContext: { smallBlind: 1, bigBlind: 2 }, priorActions: [], legalActions: { actions: ['fold'], callAmountBB: null, minBetOrRaiseBB: null, maxBetOrRaiseBB: null }, strategyAvailable: true, strategyVersion: 'preflop-v1' }, latestDecision: { id: 'd1', scenarioId: 'sc1', selectedAction: { type: 'fold' }, evaluationStatus: 'EVALUATED', category: 'PREFERRED', recommendations: null, explanation: { factors: [], assumptions: [] }, equity: { method: 'EXACT', precision: 0.001, runoutsEvaluated: 10, tieProbability: 0, participants: [{ id: 'hero', equity: 0.6, winProbability: 0.6 }] } } }), start: vi.fn(), decide: vi.fn(), next: vi.fn(), progress: vi.fn() }
}));

describe('Trainer equity rendering', () => {
  it('renders quantitative equity separately from strategy feedback', async () => {
    render(<TrainerPage />);
    expect(await screen.findByLabelText('Equity result')).toBeTruthy();
    expect(screen.getByText(/60.00% equity/)).toBeTruthy();
  });
});
