import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HandHistoryPage } from '../src/pages/HandHistoryPage';

describe('HandHistoryPage', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('renders a privacy-safe empty state', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ items: [], page: 1, pageSize: 25, total: 0, hasNextPage: false }) } as Response);
    render(<MemoryRouter><HandHistoryPage /></MemoryRouter>);
    expect(await screen.findByText('No completed hands found.')).toBeInTheDocument();
    expect(screen.queryByText(/rawDeck|opponentCards/i)).not.toBeInTheDocument();
  });
});