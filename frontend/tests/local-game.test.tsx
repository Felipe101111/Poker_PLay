import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalGamePage } from '../src/pages/LocalGamePage';
import { localGameApi, type HandStateView } from '../src/services/localGameApi';

vi.mock('../src/services/localGameApi', () => ({
  localGameApi: { startHand: vi.fn(), getState: vi.fn(), submitAction: vi.fn(), abandon: vi.fn() }
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Local poker table', () => {
  it('uses graphical cards, submits actions and keeps seat switching private', async () => {
    const hand: HandStateView = {
      id: 'local-1', bettingRound: 'flop', communityCards: [{ rank: 'Q', suit: 'd' }],
      pots: [{ amount: 30, eligibleSeats: [1, 2], winners: null }], seatToAct: 1, result: null,
      legalActions: { seatNumber: 1, actions: ['check', 'bet'], callAmount: null, minBetOrRaise: 10, maxBetOrRaise: 100 },
      seats: [
        { seatNumber: 1, stack: 100, folded: false, isAllIn: false, holeCards: [{ rank: 'A', suit: 's' }, { rank: 'K', suit: 's' }] },
        { seatNumber: 2, stack: 100, folded: false, isAllIn: false, holeCards: null }
      ]
    };
    vi.mocked(localGameApi.startHand).mockResolvedValue(hand);
    vi.mocked(localGameApi.submitAction).mockResolvedValue({ ...hand, seatToAct: 2, legalActions: null });
    vi.mocked(localGameApi.getState).mockResolvedValue({ ...hand, seatToAct: 2, legalActions: null,
      seats: [
        { ...hand.seats[0], holeCards: null },
        { ...hand.seats[1], holeCards: [{ rank: '2', suit: 'h' }, { rank: '3', suit: 'h' }] }
      ]
    });
    render(<LocalGamePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Start hand' }));
    await screen.findByRole('group', { name: 'Poker table', exact: true });
    expect(screen.getByRole('img', { name: 'Q of diamonds' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'A of spades' })).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: "Seat 2's cards" })).getAllByLabelText('Face-down card')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'check' }));
    expect(localGameApi.submitAction).toHaveBeenCalledWith(1, 'check', undefined);
    fireEvent.change(screen.getByLabelText('View as seat'), { target: { value: '2' } });
    await screen.findByRole('img', { name: '2 of hearts' });
    expect(localGameApi.getState).toHaveBeenCalledWith(2);
    expect(screen.queryByRole('img', { name: 'A of spades' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: "Seat 1's cards" })).getAllByLabelText('Face-down card')).toHaveLength(2);
  });
});