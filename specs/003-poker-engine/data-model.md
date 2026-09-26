# Phase 1 Data Model: Poker Engine (Local Single-Hand Play)

These types live in `backend/src/poker-engine/types.ts` (pure — no HTTP/DB concerns). The HTTP layer (`modules/local-games/`) maps them to/from JSON and redacts hole cards per seat.

## Card

| Field | Type | Rules |
|---|---|---|
| `rank` | `'2'..'9' \| 'T' \| 'J' \| 'Q' \| 'K' \| 'A'` | One of 13 values. |
| `suit` | `'s' \| 'h' \| 'd' \| 'c'` | One of 4 values. |

A `Deck` is an array of the 52 distinct `Card` combinations, order representing shuffle order; the "top" of the deck is dealt first.

## Seat

| Field | Type | Rules |
|---|---|---|
| `seatNumber` | integer | 1-based, unique within a `HandState`, stable for the life of the hand. |
| `stack` | integer (chips) | Starts at the hand's configured starting stack (100 BB by default, FR-001); decreases as the seat posts blinds/calls/bets/raises. |
| `holeCards` | `[Card, Card] \| null` | Exactly 2 cards once dealt (FR-003); `null` only before dealing. Never serialized to a requester whose `asSeat` differs from this seat, before showdown. |
| `folded` | boolean | `true` once the seat folds; a folded seat takes no further actions and cannot win any pot. |
| `isAllIn` | boolean | `true` once `stack` reaches 0 due to a posted blind, call, bet, or raise. |
| `streetContribution` | integer | Chips this seat has put in during the *current* betting round (reset to 0 at the start of each new street) — used to compute the amount owed to call. |
| `totalContribution` | integer | Chips this seat has put into the pot across the *entire* hand — the basis for side-pot eligibility (FR-009). |

## HandState (the `LocalHand` entity from spec.md)

| Field | Type | Rules |
|---|---|---|
| `id` | string (UUID) | Generated when the hand starts. |
| `ownerUserId` | string | The feature 001 `User.id` who started this hand — at most one active `HandState` per `ownerUserId` (FR-012), enforced by the HTTP layer's `Map`, not by this type itself. |
| `seats` | `Seat[]` | 2-9 entries (FR-001), indexed by `seatNumber`. |
| `dealerSeat`, `smallBlindSeat`, `bigBlindSeat` | integer | Assigned once when the hand starts (FR-004); fixed for the life of this single hand (no rotation — out of scope per spec). |
| `deck` | `Deck` | Remaining, undealt cards. **Never** serialized in any HTTP response, at any status. |
| `communityCards` | `Card[]` | 0 cards preflop, 3 after the flop, 4 after the turn, 5 after the river. |
| `bettingRound` | `'preflop' \| 'flop' \| 'turn' \| 'river' \| 'showdown' \| 'complete' \| 'abandoned'` | Drives which actions/transitions are valid (FR-007, FR-011). |
| `currentBet` | integer | The largest `streetContribution` among active seats this street — what a `call` must match. |
| `minRaiseIncrement` | integer | The smallest legal additional raise size this street, per standard No-Limit Hold'em rules (starts at the big blind; becomes the size of the last raise). |
| `seatToAct` | integer \| `null` | The `seatNumber` whose turn it is; `null` once the round/hand needs no further action (all folded to one, or all-in-to-showdown). |
| `pots` | `Pot[]` | Computed at showdown (or immediately if only one seat remains) — see below. |
| `actionHistory` | `Action[]` | Ordered log of every action applied this hand. |
| `result` | `HandResult \| null` | Populated once `bettingRound` is `'complete'` — winners per pot, revealed hands, amounts awarded (US3). `null` while still in progress or if abandoned. |

**Lifecycle** (state machine on `bettingRound`):

```text
(start) --> preflop --> flop --> turn --> river --> showdown --> complete
              \           \        \        \
               \           \        \        \--(all fold to one)--> complete (no showdown)
                \-----------\--------\-----------(user abandons, any point)--> abandoned
```

- Transition to the next street happens automatically once every non-folded seat has matched `currentBet` or is all-in (FR-007).
- If every remaining seat is all-in before the river, the engine skips straight through the remaining streets to `showdown` without requesting further actions (FR-011).
- `abandoned` is reachable from any non-`complete` state via the explicit abandon action (FR-016) and is terminal — an abandoned hand's `ownerUserId` slot becomes free for a new hand.

## Pot

| Field | Type | Rules |
|---|---|---|
| `amount` | integer | Total chips in this pot. |
| `eligibleSeats` | `number[]` | `seatNumber`s allowed to win this pot — the main pot includes every seat that contributed to it; a side pot excludes seats that were all-in for less (FR-009). |
| `winners` | `number[] \| null` | Populated at showdown: the `seatNumber`(s) awarded this pot (more than one only on a tie, FR-010). `null` until resolved. |

## Action

| Field | Type | Rules |
|---|---|---|
| `seatNumber` | integer | Which seat performed the action. |
| `type` | `'fold' \| 'check' \| 'call' \| 'bet' \| 'raise' \| 'all-in'` | Must have been in that seat's `LegalActions` at the time (FR-006). |
| `amount` | integer \| `null` | Chip amount for `bet`/`raise`/`call`/`all-in`; `null` for `fold`/`check`. |
| `bettingRound` | same enum as `HandState.bettingRound` (excluding `complete`/`abandoned`) | Which street this action occurred in. |

## LegalActions (derived, not stored — computed fresh from `HandState` on every read, FR-017)

| Field | Type | Rules |
|---|---|---|
| `seatNumber` | integer | Matches `HandState.seatToAct`. |
| `actions` | array of `'fold' \| 'check' \| 'call' \| 'bet' \| 'raise' \| 'all-in'` | Only the types currently legal for this seat (e.g., `check` omitted whenever `currentBet` exceeds this seat's `streetContribution`). |
| `callAmount` | integer \| `null` | Present when `call` is legal — the exact amount required. |
| `minBetOrRaise`, `maxBetOrRaise` | integer \| `null` | Present when `bet`/`raise` is legal — `maxBetOrRaise` is always this seat's remaining stack (No-Limit). |

## Redaction rule (applies to every HTTP response, not stored on `HandState` itself)

Given a response requested "as" a particular `asSeat`:
- That seat's own `holeCards` are included as-is.
- Every other seat's `holeCards` are replaced with `null` (face-down), **unless** `bettingRound` is `'showdown'` or `'complete'` **and** that other seat did not fold — then all non-folded seats' hole cards are revealed to every viewer (US3 Scenario 3 — a local hotseat session has no "other real players" to hide the result from once the hand is over).
- `HandState.deck` (the undealt cards) is never included in any response, for any `asSeat`, at any time.
