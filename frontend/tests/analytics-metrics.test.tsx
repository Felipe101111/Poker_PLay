import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsPage } from '../src/pages/AnalyticsPage';

const emptyMetric = { value: null, numerator: 0, denominator: 0, sampleThreshold: 30, isSufficient: false };
const metrics = { scope: 'ALL', vpip: emptyMetric, pfr: emptyMetric, threeBet: emptyMetric, winRate: emptyMetric };
const analyticsResponse = { analytics: { filters: { eligibleHands: 1 }, summary: { handsPlayed: 1, netResult: null, evResult: null, winRate: emptyMetric, roi: null, netResultAvailable: false, evAvailable: false }, trend: [], overall: metrics, byPosition: [{ key: 'BTN', hands: 1, metrics, limitations: [] }], byStreet: [], relatedHands: [], limitations: [] } };

describe('analytics metrics UI', () => {
  it('renders metric sections and breakdown containers', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(analyticsResponse) } as Response);
    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
    expect(await screen.findByText('Decision patterns')).toBeInTheDocument();
    expect(screen.getByText(/BTN: 1 hands/)).toBeInTheDocument();
  });
});
