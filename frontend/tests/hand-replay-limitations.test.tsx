import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { HandReplayPage } from '../src/pages/HandReplayPage';
import { replayFixture } from './fixtures/hand-replay';

describe('hand replay limitation UI', () => {
  it('shows empty timeline guidance and limitation messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ replay: { ...replayFixture.replay, events: [], limitations: [{ code: 'NO_VISIBLE_EVENTS', message: 'No replay events are visible for this hand.' }] } }) } as Response);
    render(<MemoryRouter initialEntries={['/hand-history/history-1/replay']}><Routes><Route path="/hand-history/:historyId/replay" element={<HandReplayPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('No visible replay events.')).toBeInTheDocument();
    expect(screen.getByText('No replay events are visible for this hand.')).toBeInTheDocument();
  });
});
