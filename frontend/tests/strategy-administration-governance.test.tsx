import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StrategyAdministrationPage } from '../src/pages/StrategyAdministrationPage';

const dataset = { id: 'dataset-1', key: 'six-max', name: 'Six max', description: null, activeVersions: [{ id: 'version-1', version: 'v1', compatibilityKey: 'compat', publishedAt: '2026-09-29T00:00:00.000Z' }] };
const version = { id: 'version-1', datasetId: 'dataset-1', version: 'v1', status: 'PUBLISHED', revision: 1, metadata: {}, rows: [], validationReport: null };

function mockApi() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith('/datasets')) return { ok: true, status: 200, json: () => Promise.resolve({ datasets: [dataset] }) } as Response;
    if (url.endsWith('/versions/version-1')) return { ok: true, status: 200, json: () => Promise.resolve(version) } as Response;
    if (url.includes('/history')) return { ok: true, status: 200, json: () => Promise.resolve({ history: [{ id: 'version-1', version: 'v1', status: 'PUBLISHED', source: 'editorial', createdAt: '2026-09-29T00:00:00.000Z', publishedAt: '2026-09-29T00:00:00.000Z', retiredAt: null, retiredById: null }] }) } as Response;
    if (url.includes('/audit')) return { ok: true, status: 200, json: () => Promise.resolve({ entries: [{ id: 'audit-1', action: 'PUBLISH', actorRole: 'PUBLISHER', result: 'SUCCESS', createdAt: '2026-09-29T00:00:00.000Z' }] }) } as Response;
    if (url.includes('/retire')) return { ok: true, status: 200, json: () => Promise.resolve({ ...version, status: 'RETIRED' }) } as Response;
    if (url.includes('/role')) return { ok: true, status: 200, json: () => Promise.resolve({ id: 'user-1', role: 'REVIEWER' }) } as Response;
    return { ok: true, status: 200, json: () => Promise.resolve({}) } as Response;
  });
}

describe('StrategyAdministrationPage governance views', () => {
  beforeEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('renders history and audit records without exposing sensitive payloads', async () => {
    mockApi();
    render(<MemoryRouter><StrategyAdministrationPage /></MemoryRouter>);
    await screen.findByText('Six max');
    fireEvent.click(screen.getByRole('button', { name: 'View history for Six max' }));
    expect(await screen.findByText('v1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View audit log' }));
    expect(await screen.findByText('PUBLISH')).toBeInTheDocument();
    expect(screen.queryByText(/password|token|secret/i)).not.toBeInTheDocument();
  });

  it('requires a retirement reason and sends role management through the API', async () => {
    const fetchMock = mockApi();
    render(<MemoryRouter><StrategyAdministrationPage /></MemoryRouter>);
    await screen.findByText('Six max');
    fireEvent.click(screen.getByRole('button', { name: 'v1' }));
    expect(await screen.findByText('Status: PUBLISHED')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retire version' }));
    expect(screen.getByRole('button', { name: 'Confirm retirement' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Retirement reason'), { target: { value: 'Corrected source' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm retirement' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/retire'), expect.anything()));

    fireEvent.change(screen.getByLabelText('User ID'), { target: { value: 'user-1' } });
    fireEvent.change(screen.getByLabelText('Editorial role'), { target: { value: 'REVIEWER' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign role' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/role'), expect.anything()));
  });
});
