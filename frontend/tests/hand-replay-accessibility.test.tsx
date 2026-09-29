import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { HandReplayPage } from '../src/pages/HandReplayPage';
import { replayFixture } from './fixtures/hand-replay';

describe('hand replay accessibility', () => {
  it('exposes labelled keyboard-operable controls and progress status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(replayFixture) } as Response);
    render(<MemoryRouter initialEntries={['/hand-history/history-1/replay']}><Routes><Route path="/hand-history/:historyId/replay" element={<HandReplayPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('button', { name: 'Next event' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Play replay' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Initial state');
  });
});
