import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { HandHistoryPage } from '../src/pages/HandHistoryPage';

describe('hand history filters', () => {
  it('renders filter controls and a paginated result', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ items: [{ id: 'h', sourceType: 'TRAINER', format: 'TEST', status: 'COMPLETED', startedAt: '2026-09-28T12:00:00Z', endedAt: '2026-09-28T12:05:00Z', summary: { board: [], pot: 20, result: 'WON', participantCount: 1 } }], page: 1, pageSize: 25, total: 1, hasNextPage: false }) } as Response);
    render(<MemoryRouter><HandHistoryPage /></MemoryRouter>);
    expect(await screen.findByText(/TEST/)).toBeInTheDocument();
    expect(screen.getByLabelText('Result')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});