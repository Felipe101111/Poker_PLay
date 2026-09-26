# Feature Specification: Poker Engine (Local Single-Hand Play)

**Feature Branch**: `003-poker-engine`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "Poker Engine básico + partida local de Texas Hold'em (Etapa 5-6 del roadmap del producto). El motor de reglas de póker debe ser independiente del frontend, testeable de forma aislada, y reutilizable por las futuras mesas en tiempo real y el Poker Trainer. Debe manejar: barajar/repartir cartas, dealer button, small/big blind, rondas de apuestas (preflop/flop/turn/river), acciones (fold/check/call/bet/raise/all-in), pots y side pots, showdown, evaluación de manos, y reparto del pot. El servidor es la única autoridad sobre las reglas; el cliente nunca decide el resultado. Entregable decidido con el usuario: una API REST + UI mínima jugable en modo 'hotseat' (un único usuario autenticado controla todos los asientos de la mesa, sin necesitar el multijugador por WebSocket, que es una feature futura). Alcance decidido con el usuario: esta feature implementa y valida una sola mano completa de punta a punta (reparto → showdown → reparto del pot); jugar manos consecutivas con rotación de dealer y eliminación de jugadores, así como la progresión de un torneo con niveles de ciegas, quedan fuera de alcance para una feature posterior."

## Clarifications

### Session 2026-09-26

- Q: ¿El motor debe indicar explícitamente qué acciones son legales (y sus montos mínimo/máximo) para el asiento actual, o alcanza con rechazar reactivamente los intentos inválidos? → A: Sí — el motor expone explícitamente las acciones legales y montos mínimo/máximo tras cada cambio de estado.
- Q: ¿Debe existir una forma explícita de abandonar/descartar una mano local que quedó inconclusa? → A: Sí — se agrega una acción explícita para abandonar/descartar la mano actual, liberando al usuario para iniciar una nueva.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a new local hand (Priority: P1)

An authenticated user starts a new local Texas Hold'em hand for a table of their chosen size, and the engine deals hole cards to every seat, posts the blinds, and identifies whose turn it is to act first.

**Why this priority**: Without a correctly initialized hand (deck, deal, blinds, first-to-act), nothing else in the engine can be exercised. This is the entry point for every other story.

**Independent Test**: Can be fully tested by starting a hand with a chosen seat count (2-9) and a chosen starting stack in big blinds, then verifying every seat has exactly 2 private hole cards, the small and big blind have been posted from the correct seats' stacks, and the engine reports the correct seat to act first — without revealing any seat's hole cards to any other seat.

**Acceptance Scenarios**:

1. **Given** no active local hand, **When** the user starts a new hand with N seats (2 ≤ N ≤ 9), **Then** the engine assigns a dealer, small blind, and big blind seat, deals 2 hole cards to every seat, deducts the posted blinds from the corresponding stacks, and reports which seat must act first.
2. **Given** a hand has just started, **When** the user requests the state for a given seat, **Then** that seat's own hole cards are visible but every other seat's hole cards are hidden (shown only as "face down").
3. **Given** a seat's starting stack is smaller than the big blind, **When** the user starts a hand, **Then** that seat posts its remaining stack as an all-in blind rather than being rejected or crashing the setup.
4. **Given** a local hand is in progress and the user no longer wants to continue it, **When** the user explicitly abandons the hand, **Then** the hand is discarded without a pot award, and the user is free to immediately start a new local hand.

---

### User Story 2 - Take a turn during a betting round (Priority: P1)

The user, acting on behalf of whichever seat is currently to act, submits fold, check, call, bet, raise, or all-in, and the engine validates the action, applies it to the game state, and advances to the next seat or the next betting round.

**Why this priority**: Betting is the core repeated interaction of the entire engine — without correct turn-by-turn validation, no hand can ever reach a meaningful conclusion. Equally foundational as User Story 1.

**Independent Test**: Can be fully tested by starting a hand and submitting a sequence of actions, verifying at each step that only the legal action set for the current seat is accepted, illegal attempts are rejected with a clear reason, and the engine correctly advances turn order and betting rounds (preflop → flop → turn → river) once every active seat has matched the current bet or folded.

**Acceptance Scenarios**:

1. **Given** it is seat X's turn and the current bet requires a call of C chips, **When** seat X submits `call`, **Then** C chips move from seat X's stack to the pot and the turn advances to the next seat still in the hand.
2. **Given** it is seat X's turn, **When** a different seat (not X) attempts to submit an action, **Then** the engine rejects it as out of turn and the game state does not change.
3. **Given** it is seat X's turn and a call is required, **When** seat X submits `check`, **Then** the engine rejects it as illegal (a check is only legal when no outstanding bet needs to be matched).
4. **Given** seat X wants to raise, **When** seat X submits a raise below the minimum legal raise size, **Then** the engine rejects it and states the minimum legal amount.
5. **Given** every seat still in the hand has either matched the current bet or is all-in, **When** the last required action is submitted, **Then** the engine automatically deals the next street's community card(s) (flop: 3, turn: 1, river: 1) and starts the next betting round, or proceeds to showdown if the river betting is complete.
6. **Given** every seat but one has folded, **When** the last remaining opponent folds, **Then** the hand ends immediately, the sole remaining seat is awarded the pot, and no showdown or further community cards occur.
7. **Given** it is seat X's turn, **When** the user requests the current game state, **Then** the response explicitly lists which action types are legal for seat X and, for `bet`/`raise`, the minimum and maximum legal amounts — the user is never required to guess or consult external documentation.

---

### User Story 3 - Reach showdown and award the pot (Priority: P2)

After the final betting round, the user requests the showdown result and the engine reveals the remaining seats' hole cards, determines the best 5-card hand for each, and awards the pot to the correct winner(s), splitting it evenly (with any odd chip resolved by a documented rule) in case of a tie.

**Why this priority**: Completes the hand's outcome. Valuable once Stories 1-2 already prove the hand can be played out; this closes the loop with a correct result.

**Independent Test**: Can be fully tested by playing a hand to the river with at least two seats remaining and no all-ins, then verifying the engine reveals hole cards, ranks each hand correctly per standard Texas Hold'em hand rankings, and awards the entire pot to the single best hand — or splits it evenly across tied best hands.

**Acceptance Scenarios**:

1. **Given** two or more seats reach showdown with different best hands, **When** the engine resolves the showdown, **Then** it awards the entire pot to the seat with the single best 5-card hand (using both hole cards and the community board in any combination).
2. **Given** two or more seats reach showdown with an equally-ranked best hand, **When** the engine resolves the showdown, **Then** it splits the pot evenly between the tied seats, awarding any single leftover chip (when the pot does not divide evenly) to one of the tied seats using a consistent, documented rule.
3. **Given** a showdown occurs, **When** the result is reported, **Then** every participating seat's revealed hole cards and resulting hand ranking are visible to the user (this is a local hotseat session — hiding results from "other players" does not apply here).

---

### User Story 4 - All-in with side pots (Priority: P3)

When one or more seats go all-in for less than the current bet while other seats keep betting more, the engine creates the correct main pot and side pot(s) so that a seat can only win chips it was eligible to win.

**Why this priority**: A correct but advanced rule needed for full NLHE compliance; the hand can already be played and resolved (Stories 1-3) for the common case before this is required, but no real poker engine is complete without it.

**Independent Test**: Can be fully tested by constructing a hand where seats have different remaining stacks, driving at least one seat all-in for less than another seat's subsequent bet, and verifying the engine creates a main pot (capped at the all-in amount, contested by all eligible seats) and a side pot (contested only by the seats that put in more), with each pot awarded independently at showdown.

**Acceptance Scenarios**:

1. **Given** seat A goes all-in for less than the current bet and seats B and C both call the full bet, **When** the betting round completes, **Then** the engine creates a main pot capped at seat A's all-in amount (contested by A, B, and C) and a side pot containing the excess (contested only by B and C).
2. **Given** the main and side pots described above, **When** showdown is resolved, **Then** seat A can only win (a share of) the main pot even if A's hand beats B and C, while the side pot is awarded only among the seats eligible for it.
3. **Given** every remaining seat is all-in before the river, **When** the last all-in action is submitted, **Then** the engine automatically deals the remaining community cards through the river and proceeds directly to showdown without requesting further actions.

---

### Edge Cases

- What happens when a user submits an action for a seat other than the one currently to act? (Rejected as out of turn, per US2 Scenario 2.)
- What happens when a raise amount is between the minimum legal raise and the raising seat's entire remaining stack, versus exactly equal to the remaining stack (an all-in raise)?
- What happens when all seats except one fold before any community cards are dealt (a preflop-only hand)? (Immediate pot award, no showdown — per US2 Scenario 6.)
- What happens when a tie at showdown produces a pot that does not divide evenly among the tied seats?
- What happens when a seat's stack is reduced to exactly zero by posting a blind or calling/all-in — is that seat still dealt in for any remaining action, and can it still win a pot it was eligible for?
- How does the engine behave if a user tries to start a new local hand while one is already in progress? Rejected (FR-012) unless the user explicitly abandons the in-progress hand first (FR-016).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow an authenticated user to start a new local hand by choosing a seat count from 2 to 9 and a starting stack expressed in big blinds (100 BB per Constitution's initial configuration, used as the default).
- **FR-002**: System MUST shuffle a standard 52-card deck using a randomization method that is unpredictable in normal play but reproducible when a fixed seed is supplied for automated testing (Constitution Principle 9 — deterministic and testable given controlled randomness).
- **FR-003**: System MUST deal exactly 2 private hole cards to every seat and MUST NOT reveal any seat's hole cards to a request made on behalf of a different seat before a legitimate showdown reveals them (Constitution Principle 4).
- **FR-004**: System MUST assign a dealer seat, a small blind seat, and a big blind seat for the hand, and MUST post the small and big blind automatically from those seats' stacks before any voluntary action is requested (posting the seat's full remaining stack as an all-in blind if the stack is smaller than the blind amount).
- **FR-005**: System MUST enforce strict turn order — only the seat whose turn it currently is may submit an action; any other seat's attempt MUST be rejected without changing game state.
- **FR-006**: System MUST validate every submitted action against the current game state before applying it: `check` is only legal with no outstanding bet to match, `call` requires sufficient remaining stack (or becomes an all-in call if the stack is insufficient), `bet`/`raise` MUST meet the minimum legal size (the current bet/raise increment, per standard No-Limit Hold'em rules) and MUST NOT exceed the acting seat's remaining stack, and `fold`/`all-in` are always available to the seat whose turn it is.
- **FR-007**: System MUST advance the betting round automatically (preflop → flop → turn → river → showdown) once every seat still in the hand has either matched the current bet or is all-in, dealing the correct number of community cards for each new street (flop: 3, turn: 1, river: 1) without requiring a separate user request to "deal the next street."
- **FR-008**: System MUST end the hand immediately and award the pot to the sole remaining seat, without a showdown or further community cards, whenever every other seat has folded.
- **FR-009**: System MUST calculate a main pot and any necessary side pot(s) whenever one or more seats are all-in for less than another seat's total contribution, such that a seat is only eligible to win pots it contributed to (Constitution Principle 9 — correct side pot handling).
- **FR-010**: System MUST determine the winning hand(s) at showdown using standard Texas Hold'em hand-ranking rules (best 5-card hand from each seat's 2 hole cards plus the 5 community cards), and MUST split a pot evenly among tied best hands, with any single leftover chip resolved by a consistent, documented rule.
- **FR-011**: System MUST automatically deal all remaining community cards and proceed directly to showdown, without further betting, whenever every seat still in the hand is all-in before the river.
- **FR-012**: System MUST reject any request to start a new local hand while the same user already has one in progress, until that hand has concluded (reached a pot award) or has been explicitly abandoned (FR-016).
- **FR-013**: System MUST treat all action submissions as untrusted input, re-validating turn order, action legality, and amounts server-side regardless of what the client UI displays or permits (Constitution Principle 1/3 — the server is the sole authority over game state).
- **FR-014**: System MUST NOT implement blind-level progression, multi-hand dealer rotation, player elimination across hands, or tournament advancement in this feature — a local session covers exactly one hand from deal to pot award; playing consecutive hands is explicitly deferred to a later feature.
- **FR-015**: System MUST NOT implement real-time multiplayer (distinct human players per seat, WebSocket synchronization) in this feature — all seats are driven locally by the single authenticated user who started the hand ("hotseat" mode); this is explicitly deferred to the future multiplayer feature, which MUST be able to reuse this same engine unchanged (Constitution Principle 7).
- **FR-016**: System MUST allow the user to explicitly abandon an in-progress local hand at any point, discarding it without a pot award and freeing the user to immediately start a new one (resolves the otherwise-permanent block from FR-012).
- **FR-017**: System MUST include, in every game-state response describing whose turn it is, the explicit set of legal action types for the seat to act and, for `bet`/`raise`, the minimum and maximum legal amounts, computed from the current game state (not left for the client to infer or guess).

### Key Entities *(include if feature involves data)*

- **LocalHand**: Represents one in-progress or completed local Texas Hold'em hand for a single authenticated user. Attributes: unique ID, owning user, seat count, current betting round (preflop/flop/turn/river/showdown/complete/abandoned), dealer/small-blind/big-blind seat assignments, the shared community board (0-5 cards depending on street), the deck's remaining cards (never exposed to any client), an ordered action history, and — whenever a seat is waiting to act — that seat's computed legal action types and, for `bet`/`raise`, the minimum/maximum legal amounts (FR-017).
- **Seat**: A position at a `LocalHand`'s table. Attributes: seat number, stack size, 2 private hole cards, folded/all-in status, current-street contribution, and total-hand contribution (used for side pot calculation).
- **Pot**: One or more pots resulting from a single hand — a main pot plus zero or more side pots. Attributes: amount, and the set of seats eligible to win it.
- **Action**: A single fold/check/call/bet/raise/all-in event. Attributes: seat, type, amount (if applicable), and the betting round it occurred in — forms the hand's action history.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can start and fully complete a local hand (deal through pot award) for any table size from 2 to 9 seats without the engine erroring or producing an invalid game state.
- **SC-002**: 100% of illegal action attempts (out of turn, insufficient stack, below-minimum raise, illegal check) are rejected without altering the game state.
- **SC-003**: 100% of showdowns with no all-in produce a winner determination that matches standard Texas Hold'em hand-ranking rules, including correct even splitting of ties.
- **SC-004**: 100% of hands involving one or more all-ins with unequal stacks produce main/side pot amounts and eligible-winner sets that correctly reflect each seat's total contribution.
- **SC-005**: A user can always tell, directly from the game state returned by the system (an explicit legal-actions list with min/max amounts, per FR-017), whose turn it is and which actions are currently legal, without needing to consult external documentation.

## Assumptions

- Seats in a local hand are anonymous table positions ("Seat 1", "Seat 2", ...), not distinct registered `User` accounts from feature 001 — the single authenticated user who starts the hand drives every seat. Associating individual seats with distinct real users' identities is deferred to the future real-time multiplayer feature.
- The starting stack defaults to 100 big blinds per the Constitution's initial configuration; blinds are fixed for the duration of the single hand (no escalating blind levels, since that is a tournament-progression concern out of scope here).
- The dealer seat for the one hand covered by this feature is assigned automatically (e.g., a fixed or randomly chosen starting seat) since there is no previous hand to rotate from in a single-hand scope.
- Hand history is not persisted to a database in this feature — a `LocalHand` exists only for the duration of the session. Persisting completed hands for later review is deferred to a future history/statistics feature (roadmap Etapa 16).
- The deliverable is a REST API plus a minimal playable frontend screen (table view, action buttons, hole cards, pot/board display) sufficient to drive and observe a full hand — polished visual design is out of scope and deferred to a future UI-polish pass (roadmap Etapa 17).
- The odd-chip rule for indivisible split pots (US3 Scenario 2) awards the extra chip to the tied seat closest to the left of the dealer, a common, simple, and consistent convention.
