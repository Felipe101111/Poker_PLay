import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrainerPage } from '../src/pages/TrainerPage';

function response(body: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
}

const scenario = {
  id: 'scenario-1', sequence: 1, tableSize: 6, position: 'BTN', effectiveStackBB: 100,
  holeCards: [{ rank: 'A', suit: 's' }, { rank: 'K', suit: 'h' }],
  blindContext: { smallBlind: 1, bigBlind: 2 }, priorActions: [],
  legalActions: { actions: ['fold', 'raise'], callAmountBB: null, minBetOrRaiseBB: 2.5, maxBetOrRaiseBB: 100 },
  strategyAvailable: true, strategyVersion: 'preflop-v1'
};

const decision = (category: string | null, evaluationStatus = 'EVALUATED') => ({
  id: 'decision-1', scenarioId: 'scenario-1', selectedAction: { type: 'fold' }, evaluationStatus,
  category, recommendations: null, explanation: { factors: ['position'], assumptions: [] }
});

const session = (latestDecision = null, currentScenario = scenario, status = 'ACTIVE') => ({
  session: { id: 'session-1', status, format: 'SIX_MAX_100BB_PREFLOP' }, scenario: currentScenario, latestDecision
});

describe('TrainerPage', () => {
  beforeEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('renders a resumed scenario and displays the server result', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => response(session()))
      .mockImplementationOnce(() => response({ decision: decision('ACCEPTABLE_MIXED'), duplicate: false }, 201));

    render(<TrainerPage />);
    expect(await screen.findByText(/Position: BTN/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'fold' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'fold' }));
    expect(await screen.findByRole('heading', { name: 'ACCEPTABLE_MIXED' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'fold' })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/trainer/session/decisions'), expect.objectContaining({ method: 'POST' }));
  });

  it.each(['PREFERRED', 'ACCEPTABLE_MIXED', 'MARGINAL', 'SIGNIFICANT_DEVIATION'])('renders the %s educational category', async (category) => {
    vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => response(session()))
      .mockImplementationOnce(() => response({ decision: decision(category), duplicate: false }, 201));

    render(<TrainerPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'fold' }));
    expect(await screen.findByRole('heading', { name: category })).toBeInTheDocument();
    expect(screen.getByText('position')).toBeInTheDocument();
  });

  it('renders unavailable feedback and continues only after server acknowledgement', async () => {
    const nextScenario = { ...scenario, id: 'scenario-2', sequence: 2, position: 'CO' };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => response(session()))
      .mockImplementationOnce(() => response({ decision: decision(null, 'UNAVAILABLE'), duplicate: false }, 201))
      .mockImplementationOnce(() => response({ ...session(decision(null, 'UNAVAILABLE'), nextScenario), decision: decision(null, 'UNAVAILABLE') }, 201));

    render(<TrainerPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'fold' }));
    expect(await screen.findByRole('heading', { name: 'UNAVAILABLE' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next scenario' }));
    expect(await screen.findByText(/Position: CO/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Next scenario loaded.');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/trainer/session/next'), expect.objectContaining({ method: 'POST' }));
  });

  it('recovers a closed session result without showing actions', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => response(session(decision('PREFERRED'), null, 'COMPLETED')));

    render(<TrainerPage />);
    expect(await screen.findByRole('heading', { name: 'PREFERRED' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Legal actions')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next scenario' })).toBeInTheDocument();
  });

  it('shows an error when session loading fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => response({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }, 401))
      .mockImplementationOnce(() => response({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }, 401));
    render(<TrainerPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to load trainer session'));
  });
});
