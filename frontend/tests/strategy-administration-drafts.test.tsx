import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StrategyAdministrationPage } from '../src/pages/StrategyAdministrationPage';

const response = { datasets: [{ id: 'dataset-1', key: 'six-max', name: 'Six max', description: null, activeVersions: [] }] };

describe('StrategyAdministrationPage', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('renders the catalog and keeps server-owned draft fields explicit', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(response) } as Response);
    render(<MemoryRouter><StrategyAdministrationPage /></MemoryRouter>);
    expect(await screen.findByText('Six max')).toBeInTheDocument();
    expect(screen.queryByText('No strategy datasets yet.')).not.toBeInTheDocument();
  });

  it('preserves an access-denied server error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 403, json: () => Promise.resolve({ error: { code: 'FORBIDDEN', message: 'Editorial permission required' } }) } as Response);
    render(<MemoryRouter><StrategyAdministrationPage /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Editorial permission required');
  });
});
