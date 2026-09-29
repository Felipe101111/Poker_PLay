import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { HandHistoryDetailPage } from '../src/pages/HandHistoryDetailPage';

describe('hand history privacy', () => {
  it('keeps unavailable legacy data as a limitation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ hand: { id: 'h', sourceType: 'TRAINER', format: 'TEST', status: 'ANONYMIZED', startedAt: '2026-09-28T12:00:00Z', endedAt: '2026-09-28T12:05:00Z', summary: { board: [], pot: null, result: null, participantCount: 0 }, board: [], participants: [], actions: [], pots: [], revealedCards: [], limitations: ['legacy'] } }) } as Response);
    render(<MemoryRouter initialEntries={['/hand-history/h']}><Routes><Route path="/hand-history/:historyId" element={<HandHistoryDetailPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Some legacy data is unavailable.')).toBeInTheDocument();
  });
});