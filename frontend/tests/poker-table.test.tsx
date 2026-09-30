import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PlayingCard, PokerTable } from '../src/components/PokerTable';

afterEach(cleanup);

describe('Poker table presentation', () => {
  it('renders readable card faces with suit colors and concealed card backs', () => {
    render(<><PlayingCard card={{ rank: 'T', suit: 'hearts' }} /><PlayingCard card={{ rank: 'A', suit: 's' }} /><PlayingCard /></>);
    expect(screen.getByRole('img', { name: '10 of hearts' })).toHaveClass('playing-card--red');
    expect(screen.getByRole('img', { name: 'A of spades' })).not.toHaveClass('playing-card--red');
    expect(screen.getByRole('img', { name: 'Face-down card' })).toHaveClass('playing-card--back');
  });

  it('shows board slots, chips, dealer and turn without inventing opponents cards', () => {
    render(<PokerTable handId="hand-1" pot={120} street="flop" actingSeat={2} dealerSeat={1}
      board={[{ rank: '3', suit: 's' }, { rank: '9', suit: 'h' }, { rank: '2', suit: 'c' }]}
      players={[
        { seatNumber: 1, username: 'Host', stack: 900, folded: true, isAllIn: false, holeCards: null },
        { seatNumber: 2, username: 'Guest', stack: 980, folded: false, isAllIn: false, holeCards: [{ rank: 'K', suit: 'd' }, { rank: 'K', suit: 'c' }], streetContribution: 20 }
      ]} />);
    const board = screen.getByRole('group', { name: 'Community cards' });
    expect(within(board).getAllByRole('img')).toHaveLength(5);
    expect(within(board).getAllByLabelText('Unrevealed community card')).toHaveLength(2);
    expect(within(screen.getByRole('group', { name: "Host's cards" })).getAllByLabelText('Face-down card')).toHaveLength(2);
    expect(screen.getByLabelText('Seat 2: Guest, acting')).toHaveClass('poker-seat--active');
    expect(screen.getByLabelText('Dealer')).toBeInTheDocument();
    expect(screen.getByText('Bet 20')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('retains existing board cards when the next street arrives', () => {
    const props = { handId: 'hand-1', pot: 0, street: 'flop', actingSeat: null, players: [] };
    const { rerender } = render(<PokerTable {...props} board={[{ rank: 'A', suit: 's' }]} />);
    const firstCard = screen.getByLabelText('A of spades');
    rerender(<PokerTable {...props} street="turn" board={[{ rank: 'A', suit: 's' }, { rank: 'Q', suit: 'd' }]} />);
    expect(screen.getByLabelText('A of spades')).toBe(firstCard);
    expect(screen.getByLabelText('Q of diamonds')).toBeInTheDocument();
  });
});