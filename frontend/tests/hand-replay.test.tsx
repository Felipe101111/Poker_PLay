import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { HandReplayPage } from '../src/pages/HandReplayPage';
import { replayFixture } from './fixtures/hand-replay';

describe('hand replay page', () => {
  it('renders the initial state and ordered timeline', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(replayFixture) } as Response);
    render(<MemoryRouter initialEntries={['/hand-history/history-1/replay']}><Routes><Route path="/hand-history/:historyId/replay" element={<HandReplayPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Replay: SIX_MAX_100BB' })).toBeInTheDocument();
    expect(screen.getByText('Initial state')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to event 1' })).toBeInTheDocument();
  });
});
