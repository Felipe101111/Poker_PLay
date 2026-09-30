import type { CSSProperties } from 'react';
import type { Card } from '../services/multiplayerApi';
import '../styles/poker-table.css';

const suits: Record<string, { symbol: string; name: string; red: boolean }> = {
  s: { symbol: '\u2660', name: 'spades', red: false },
  h: { symbol: '\u2665', name: 'hearts', red: true },
  d: { symbol: '\u2666', name: 'diamonds', red: true },
  c: { symbol: '\u2663', name: 'clubs', red: false }
};

export function PlayingCard({ card, index = 0 }: { card?: Card; index?: number }) {
  const suit = card ? suits[card.suit.toLowerCase()[0]] : undefined;
  const rank = card?.rank === 'T' ? '10' : card?.rank;
  const label = card ? `${rank} of ${suit?.name ?? card.suit}` : 'Face-down card';

  return (
    <span role="img" aria-label={label}
      className={`playing-card ${card ? 'playing-card--face' : 'playing-card--back'}${suit?.red ? ' playing-card--red' : ''}`}
      style={{ '--deal-delay': `${index * 90}ms` } as CSSProperties}>
      {card ? <span aria-hidden="true" className="playing-card__face">
        <span className="playing-card__corner">{rank}<span>{suit?.symbol}</span></span>
        <span className="playing-card__suit">{suit?.symbol}</span>
        <span className="playing-card__corner playing-card__corner--bottom">{rank}<span>{suit?.symbol}</span></span>
      </span> : <span aria-hidden="true" className="playing-card__back-mark">{suits.s.symbol}</span>}
    </span>
  );
}

export function ChipStack({ amount }: { amount: number }) {
  return <span className="poker-chips" aria-hidden="true">
    {[0, 1, 2].slice(0, amount > 0 ? 3 : 0).map((stack) => (
      <span key={stack} className={`poker-chips__pile poker-chips__pile--${stack}`}>
        {[0, 1, 2].map((chip) => <span key={chip} className="poker-chips__chip" style={{ bottom: `${chip * 4}px` }} />)}
      </span>
    ))}
  </span>;
}

interface PokerSeat {
  seatNumber: number;
  username: string;
  stack: number;
  folded: boolean;
  isAllIn: boolean;
  holeCards: Card[] | null;
  eliminated?: boolean;
  connectionStatus?: string;
  streetContribution?: number;
}

interface PokerTableProps {
  handId: string;
  board: Card[];
  players: PokerSeat[];
  pot: number;
  street: string;
  actingSeat: number | null;
  dealerSeat?: number;
  winningSeats?: number[];
}

export function PokerTable({ handId, board, players, pot, street, actingSeat, dealerSeat, winningSeats = [] }: PokerTableProps) {
  const seats = [...players].sort((first, second) => first.seatNumber - second.seatNumber);

  return (
    <div className="poker-stage" role="group" aria-label="Poker table">
      <div className="poker-felt" aria-hidden="true"><span>TEXAS HOLD'EM</span></div>
      <div className="poker-board">
        <span className="poker-board__street">{street}</span>
        <div className="poker-board__cards" role="group" aria-label="Community cards">
          {Array.from({ length: 5 }, (_, index) => board[index]
            ? <PlayingCard key={`${handId}-${index}-${board[index].rank}-${board[index].suit}`} card={board[index]} index={index} />
            : <span className="poker-board__placeholder" key={`empty-${index}`} role="img" aria-label="Unrevealed community card" />)}
        </div>
        <div className="poker-pot"><ChipStack amount={pot} /><span>Total pot <strong>{pot.toLocaleString('en-US')}</strong></span></div>
      </div>
      <ul className="poker-seats" aria-label="Players">
        {seats.map((player, index) => {
          const angle = (index / seats.length) * Math.PI * 2;
          const leftCount = Math.ceil((seats.length - 1) / 2);
          const rightCount = seats.length - 1 - leftCount;
          const onLeft = index <= leftCount;
          const mobileX = index === 0 || seats.length === 2 ? 50 : onLeft ? 15 : 85;
          const mobileY = index === 0 ? 91 : seats.length === 2 ? 9 : onLeft
            ? leftCount === 1 ? 20 : 75 - (index - 1) * 60 / (leftCount - 1)
            : rightCount === 1 ? 20 : 15 + (index - leftCount - 1) * 60 / (rightCount - 1);
          const active = player.seatNumber === actingSeat;
          const winner = winningSeats.includes(player.seatNumber);
          const status = player.eliminated ? 'Eliminated' : player.folded ? 'Folded' : player.isAllIn ? 'All-in' : active ? 'Acting' : winner ? 'Winner' : player.connectionStatus === 'DISCONNECTED' ? 'Disconnected' : `Seat ${player.seatNumber}`;
          return <li key={player.seatNumber}
            className={`poker-seat${active ? ' poker-seat--active' : ''}${player.folded || player.eliminated ? ' poker-seat--folded' : ''}${winner ? ' poker-seat--winner' : ''}`}
            style={{ '--seat-x': `${50 + 41 * Math.sin(angle)}%`, '--seat-y': `${50 + 39 * Math.cos(angle)}%`, '--seat-mobile-x': `${mobileX}%`, '--seat-mobile-y': `${mobileY}%`, '--seat-color': ['#87cce1', '#dbaaed', '#f3c875', '#f29b9b'][index % 4] } as CSSProperties}
            aria-label={`Seat ${player.seatNumber}: ${player.username}${active ? ', acting' : ''}`}>
            <div className="poker-seat__cards" role="group" aria-label={`${player.username}'s cards`}>
              {!player.eliminated && (player.holeCards?.length ? player.holeCards.map((card, cardIndex) =>
                <PlayingCard key={`${handId}-${card.rank}-${card.suit}`} card={card} index={cardIndex} />)
                : [0, 1].map((cardIndex) => <PlayingCard key={`${handId}-hidden-${cardIndex}`} index={cardIndex} />))}
            </div>
            <div className="poker-seat__identity">
              <span className="poker-seat__avatar" aria-hidden="true">{player.username.slice(0, 2).toUpperCase()}</span>
              <div className="poker-seat__details"><strong title={player.username}>{player.username}</strong><span className="poker-seat__stack"><ChipStack amount={player.stack} />{player.stack.toLocaleString('en-US')}</span></div>
              {dealerSeat === player.seatNumber && <span className="poker-dealer" aria-label="Dealer">D</span>}
            </div>
            <span className="poker-seat__status">{status}</span>
            {!!player.streetContribution && <span className="poker-seat__bet">Bet {player.streetContribution.toLocaleString('en-US')}</span>}
          </li>;
        })}
      </ul>
    </div>
  );
}