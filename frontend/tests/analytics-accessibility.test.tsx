import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AnalyticsPage } from '../src/pages/AnalyticsPage';

const emptyMetric = { value: null, numerator: 0, denominator: 0, sampleThreshold: 30, isSufficient: false };
const analyticsResponse = { analytics: { filters: { eligibleHands: 0 }, summary: { handsPlayed: 0, netResult: null, evResult: null, winRate: emptyMetric, roi: null, netResultAvailable: false, evAvailable: false }, trend: [], overall: { scope: 'ALL', vpip: emptyMetric, pfr: emptyMetric, threeBet: emptyMetric, winRate: emptyMetric }, byPosition: [], byStreet: [], relatedHands: [], limitations: [{ code: 'NO_RESULTS', message: 'No hands' }] } };

describe('analytics accessibility', () => {
  it('labels the filter form and exposes state sections', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(analyticsResponse) } as Response);
    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
    expect(await screen.findByRole('form', { name: 'Analytics filters' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No eligible hands');
  });
});
