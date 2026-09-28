import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TrainerProgressPage } from '../src/pages/TrainerProgressPage';

function response(body: unknown) { return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) }); }

describe('TrainerProgressPage', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('renders populated counts and unavailable decisions', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => response({ progress: { completedDecisions: 3, preferred: 1, acceptableMixed: 1, marginal: 0, significantDeviation: 0, unavailable: 1, byAction: { fold: 3 }, empty: false } }));
    render(<TrainerProgressPage />);
    expect(await screen.findByText('Completed: 3')).toBeInTheDocument();
    expect(screen.getByText('Unavailable: 1')).toBeInTheDocument();
  });

  it('renders the empty state', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => response({ progress: { completedDecisions: 0, preferred: 0, acceptableMixed: 0, marginal: 0, significantDeviation: 0, unavailable: 0, byAction: {}, empty: true } }));
    render(<TrainerProgressPage />);
    expect(await screen.findByRole('status')).toHaveTextContent('No training decisions yet.');
  });
});
