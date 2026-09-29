import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsPage } from '../src/pages/AnalyticsPage';

const response = { analytics: { filters: { relatedLimit: 20, eligibleHands: 1 }, summary: { handsPlayed: 1, netResult: 12, evResult: 10, winRate: { value: 1, numerator: 1, denominator: 1, sampleThreshold: 30, isSufficient: false }, roi: null, netResultAvailable: true, evAvailable: true }, trend: [], overall: { scope: 'ALL', vpip: { value: null, numerator: 0, denominator: 0, sampleThreshold: 30, isSufficient: false }, pfr: { value: null, numerator: 0, denominator: 0, sampleThreshold: 30, isSufficient: false }, threeBet: { value: null, numerator: 0, denominator: 0, sampleThreshold: 30, isSufficient: false }, winRate: { value: 1, numerator: 1, denominator: 1, sampleThreshold: 30, isSufficient: false } }, byPosition: [], byStreet: [], relatedHands: [], limitations: [] } };

describe('AnalyticsPage', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('renders summary, sample warning, and privacy-safe empty related hands', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(response) } as Response);
    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
    expect(await screen.findByText('Net result: 12')).toBeInTheDocument();
    expect(screen.getAllByText(/Limited sample/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/rawDeck|privateCards|opponentCards/i)).not.toBeInTheDocument();
  });
});
