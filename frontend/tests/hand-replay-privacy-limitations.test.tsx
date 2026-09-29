import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { HandReplayPage } from '../src/pages/HandReplayPage';
import { replayFixture } from './fixtures/hand-replay';

describe('hand replay privacy and limitations', () => {
  it('renders only server-projected values and limitation messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ ...replayFixture, replay: { ...replayFixture.replay, limitations: [{ code: 'UNAVAILABLE_STATE', message: 'State unavailable for this event.' }] } }) } as Response);
    render(<MemoryRouter initialEntries={['/hand-history/history-1/replay']}><Routes><Route path="/hand-history/:historyId/replay" element={<HandReplayPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('State unavailable for this event.')).toBeInTheDocument();
    expect(screen.queryByText(/userId|token|password/i)).not.toBeInTheDocument();
  });
});
