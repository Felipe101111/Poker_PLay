import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrainerPage } from '../src/pages/TrainerPage';

describe('postflop Trainer UI', () => {
  it('renders street, board, pot, and submits through the postflop endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        session: { id: 'session-1', status: 'ACTIVE', format: 'SIX_MAX_100BB_POSTFLOP' },
        scenario: {
          id: 'scenario-1', sequence: 1, tableSize: 6, street: 'flop',
          board: [{ rank: 'A', suit: 's' }, { rank: 'K', suit: 'h' }, { rank: '2', suit: 'd' }], potBB: 6,
          position: 'SB', effectiveStackBB: 99, holeCards: [{ rank: 'Q', suit: 'h' }, { rank: 'Q', suit: 'c' }],
          blindContext: { smallBlind: 1, bigBlind: 2 }, priorActions: [],
          legalActions: { actions: ['check'], callAmountBB: null, minBetOrRaiseBB: null, maxBetOrRaiseBB: null },
          strategyAvailable: true, strategyVersion: 'postflop-v1'
        }, latestDecision: null
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ decision: { id: 'decision-1', scenarioId: 'scenario-1', selectedAction: { type: 'check' }, evaluationStatus: 'EVALUATED', category: 'PREFERRED', recommendations: null, explanation: { factors: [], assumptions: [] }, equity: null }, duplicate: false }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    render(<TrainerPage />);
    expect(await screen.findByText(/Street: flop/)).toBeInTheDocument();
    expect(screen.getByText(/Board: As Kh 2d/)).toBeInTheDocument();
    expect(screen.getByText('Pot: 6 BB')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'check' }));
    await screen.findByRole('heading', { name: 'PREFERRED' });
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('/api/trainer/postflop/session/decisions'), expect.objectContaining({ method: 'POST' }));
  });

  it('renders ordered street review history after refresh', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ session: { id: 's', status: 'ACTIVE', format: 'SIX_MAX_100BB_POSTFLOP' }, scenario: null, latestDecision: null, history: [{ id: 'd', scenarioId: 'sc', street: 'flop', evaluationStatus: 'UNAVAILABLE', category: null, recommendations: null, explanation: { factors: [], assumptions: [] }, limitations: ['Unavailable'] }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    render(<TrainerPage />);
    expect(await screen.findByRole('heading', { name: 'Street review' })).toBeInTheDocument();
    expect(screen.getByText(/flop: UNAVAILABLE/)).toBeInTheDocument();
  });
});
