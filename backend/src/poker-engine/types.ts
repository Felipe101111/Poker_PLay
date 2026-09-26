export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Suit = 's' | 'h' | 'd' | 'c';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type Deck = Card[];

export type BettingRound =
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'complete'
  | 'abandoned';

export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface Seat {
  seatNumber: number;
  stack: number;
  holeCards: [Card, Card] | null;
  folded: boolean;
  isAllIn: boolean;
  streetContribution: number;
  totalContribution: number;
  /** Internal bookkeeping (not part of any API response): has this seat acted since the last raise/new street? */
  actedThisStreet: boolean;
}

export interface Pot {
  amount: number;
  eligibleSeats: number[];
  winners: number[] | null;
}

export interface Action {
  seatNumber: number;
  type: ActionType;
  amount: number | null;
  bettingRound: Exclude<BettingRound, 'complete' | 'abandoned'>;
}

export interface LegalActions {
  seatNumber: number;
  actions: ActionType[];
  callAmount: number | null;
  minBetOrRaise: number | null;
  maxBetOrRaise: number | null;
}

export interface HandResult {
  potsAwarded: Pot[];
  revealedSeats: number[];
}

// HandState is the implementation of spec.md's "LocalHand" entity.
export interface HandState {
  id: string;
  ownerUserId: string;
  seats: Seat[];
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  deck: Deck;
  communityCards: Card[];
  bettingRound: BettingRound;
  currentBet: number;
  minRaiseIncrement: number;
  seatToAct: number | null;
  pots: Pot[];
  actionHistory: Action[];
  result: HandResult | null;
}
