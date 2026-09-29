import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { HandHistoryDetailPage } from '../src/pages/HandHistoryDetailPage';

describe('hand history detail', () => {
  it('renders ordered actions and the privacy action', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ hand: { id: 'h', sourceType: 'TRAINER', format: 'TEST', status: 'COMPLETED', startedAt: '2026-09-28T12:00:00Z', endedAt: '2026-09-28T12:05:00Z', summary: { board: [], pot: 10, result: 'WON', participantCount: 1 }, board: ['Ah'], participants: [{ seatNumber: 1, displayName: 'You', isViewer: true }], actions: [{ sequence: 1, street: 'PREFLOP', seatNumber: 1, type: 'call', amount: 2 }], pots: [], revealedCards: [], limitations: [] } }) } as Response);
    render(<MemoryRouter initialEntries={['/hand-history/h']}><Routes><Route path="/hand-history/:historyId" element={<HandHistoryDetailPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(/PREFLOP/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove from my history' })).toBeInTheDocument();
  });
});