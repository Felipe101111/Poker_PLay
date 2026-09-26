---

description: "Task list template for feature implementation"
---

# Tasks: Poker Engine (Local Single-Hand Play)

**Input**: Design documents from `/specs/003-poker-engine/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/local-games-api.md, quickstart.md

**Tests**: Included — Constitution Principle 26 explicitly names hand evaluation, pot calculation, side pots, betting rules, and turn order as requiring automated tests, and this feature implements all of them.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent implementation and testing of each story.

**Note**: Renumbered after `/speckit-analyze` (2026-09-26) to add the previously-uncovered FR-016 (abandon hand) tasks (finding G1) and fold the `404 HAND_NOT_FOUND` case into the state contract test (finding M1). Total 47 tasks (was 45).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths are included in every description

## Path Conventions

Extends the existing web app split: `backend/src/poker-engine/` (pure engine, no framework deps), `backend/src/modules/local-games/` (HTTP layer), `backend/tests/`, `frontend/src/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: New module scaffolding — no new dependencies (research.md confirms the engine is dependency-free and the HTTP layer reuses feature 001's stack)

- [X] T001 Create the pure engine module skeleton: `backend/src/poker-engine/types.ts`, `rng.ts`, `deck.ts`, `betting.ts`, `pots.ts`, `hand-evaluator.ts`, `engine.ts` (empty stubs) per plan.md Project Structure
- [X] T002 Create the HTTP module skeleton: `backend/src/modules/local-games/local-games.routes.ts`, `local-games.service.ts`, `local-games.validation.ts` (empty stubs)
- [X] T003 [P] Create `backend/tests/unit/poker-engine/` and confirm `backend/tests/contract/` / `backend/tests/integration/` are ready for this feature's test files (reuse feature 001's `vitest.config.ts`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and plumbing that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Define the core types in `backend/src/poker-engine/types.ts` per data-model.md: `Card` (`rank`/`suit`), `Deck`, `Seat` (`seatNumber`, `stack`, `holeCards`, `folded`, `isAllIn`, `streetContribution`, `totalContribution`), `HandState` (`id`, `ownerUserId`, `seats`, `dealerSeat`/`smallBlindSeat`/`bigBlindSeat`, `deck`, `communityCards`, `bettingRound` including `'abandoned'`, `currentBet`, `minRaiseIncrement`, `seatToAct`, `pots`, `actionHistory`, `result`), `Pot` (`amount`, `eligibleSeats`, `winners`), `Action`, `LegalActions` — with zero imports from Express/Prisma/zod (Constitution P7). `HandState` is the implementation of spec.md's `LocalHand` entity.
- [X] T005 [P] Implement a seedable PRNG in `backend/src/poker-engine/rng.ts` (mulberry32-style), seeded from `crypto.randomInt` when no explicit seed is supplied (FR-002, research.md)
- [X] T006 [P] Implement `createDeck()` (52 unique cards), `shuffle(deck, rng)` (Fisher-Yates), `dealHoleCards(seats, deck)`, and `dealCommunityCards(count, deck)` in `backend/src/poker-engine/deck.ts` (depends on T004, T005)
- [X] T007 [P] Implement `zod` schemas for starting a hand (`seatCount`: integer 2-9, `startingStackBB`: optional positive integer, default 100) and submitting an action (`seatNumber`: integer, `type`: enum, `amount`: optional integer) in `backend/src/modules/local-games/local-games.validation.ts`
- [X] T008 [P] Wire an (initially empty) `localGamesRouter` into `backend/src/app.ts` at `/api/local-games`, behind the existing `requireAuth` guard from feature 001
- [X] T009 [P] Implement the in-memory session store — `Map<userId, HandState>` with get/set/delete helpers enforcing "at most one active hand per user" (FR-012) — in `backend/src/modules/local-games/local-games.service.ts`
- [X] T010 [P] Add the local-games API client base (`startHand`, `getState`, `submitAction`, `abandon`) in `frontend/src/services/localGameApi.ts`, built on feature 001's `apiClient`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Start a new local hand (Priority: P1) 🎯 MVP

**Goal**: An authenticated user starts a new local hand (2-9 seats) and the engine deals hole cards, posts blinds, and identifies who acts first (FR-001–FR-004); the user can also explicitly abandon an in-progress hand (FR-016).

**Independent Test**: Starting a hand deals exactly 2 hole cards per seat, posts the correct blinds (all-in if a stack is smaller than the blind), a request "as" any seat reveals only that seat's own hole cards, and abandoning the hand immediately frees the user to start a new one.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [P] [US1] Unit test: `shuffle()` with a fixed seed is deterministic (same seed → same order) and always produces a full, non-duplicated 52-card permutation, in `backend/tests/unit/poker-engine/deck.test.ts`
- [X] T012 [P] [US1] Unit test: starting a hand assigns dealer/small-blind/big-blind seats, posts the correct blind amounts, and posts a short stack's entire remaining stack as an all-in blind when it's smaller than the blind (FR-004), in `backend/tests/unit/poker-engine/engine.test.ts`
- [X] T013 [P] [US1] Contract test for `POST /api/local-games` (`201` new hand, `400` for `seatCount` outside 2-9, `409` when the caller already has an active hand) per contracts/local-games-api.md in `backend/tests/contract/local-games.start.test.ts`
- [X] T014 [P] [US1] Contract test for `GET /api/local-games/current?asSeat=` confirming each seat's view shows only its own `holeCards` (others `null`) before showdown, **and** that it returns `404 HAND_NOT_FOUND` when the caller has no active hand, in `backend/tests/contract/local-games.state.test.ts`
- [X] T015 [P] [US1] Contract test for `DELETE /api/local-games/current` (`204` when a hand is abandoned, `204` idempotently when there was none) and that a subsequent `POST /api/local-games` succeeds afterward instead of `409` (FR-016) in `backend/tests/contract/local-games.abandon.test.ts`

### Implementation for User Story 1

- [X] T016 [US1] Implement `engine.startHand(seatCount, startingStackBB, rngSeed?)` in `backend/src/poker-engine/engine.ts` (depends on T004, T006): assign dealer/SB/BB, shuffle + deal hole cards, post blinds (all-in if insufficient stack), set `bettingRound` to `preflop` and `seatToAct` to the correct first-to-act seat
- [X] T017 [US1] Implement the seat-scoped redaction function (data-model.md's Redaction rule) in `backend/src/modules/local-games/local-games.service.ts` (depends on T004): given a `HandState` and an `asSeat`, hide every other non-revealed seat's `holeCards` and never include `deck`
- [X] T018 [US1] Implement hand abandonment — removing the caller's entry from the in-memory store (FR-016) — as a service function in `backend/src/modules/local-games/local-games.service.ts` (depends on T009)
- [X] T019 [US1] Implement the `POST /api/local-games`, `GET /api/local-games/current`, and `DELETE /api/local-games/current` routes in `backend/src/modules/local-games/local-games.routes.ts` (depends on T016, T017, T018, T009, T007)
- [X] T020 [P] [US1] Build the initial `LocalGamePage` (start-hand form for seat count/stack, table view with seats/board/pot, a seat switcher to view `asSeat`, an abandon-hand button) in `frontend/src/pages/LocalGamePage.tsx` (depends on T010)

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently

---

## Phase 4: User Story 2 - Take a turn during a betting round (Priority: P1)

**Goal**: The engine validates and applies fold/check/call/bet/raise/all-in actions in strict turn order and auto-advances betting rounds (FR-005–FR-008, FR-017).

**Independent Test**: Submitting actions in sequence only succeeds for the correct seat and legal action/amount at each step; once every active seat matches the bet or is all-in, the engine automatically deals the next street.

### Tests for User Story 2 ⚠️

- [ ] T021 [P] [US2] Unit test: `computeLegalActions` returns the correct action set and `callAmount`/`minBetOrRaise`/`maxBetOrRaise` for check/call/bet/raise scenarios, including an all-in call when the stack is smaller than the amount owed, in `backend/tests/unit/poker-engine/betting.test.ts`
- [ ] T022 [P] [US2] Unit test: `applyAction` rejects an out-of-turn seat, an illegal `check` when a call is owed, and a `raise` below `minRaiseIncrement`, in all cases without mutating `HandState` (FR-006), in `backend/tests/unit/poker-engine/betting.test.ts`
- [ ] T023 [P] [US2] Unit test: once every active seat matches `currentBet` or is all-in, the engine deals the correct number of community cards (flop 3, turn 1, river 1) and starts the next `bettingRound` automatically (FR-007), in `backend/tests/unit/poker-engine/engine.test.ts`
- [ ] T024 [P] [US2] Unit test: when every seat but one has folded, the hand ends immediately with a pot award and `bettingRound` becomes `complete` without a showdown (FR-008), in `backend/tests/unit/poker-engine/engine.test.ts`
- [ ] T025 [P] [US2] Contract test for `POST /api/local-games/current/actions` (`200` valid action with updated `legalActions`, `400 ILLEGAL_ACTION` with a specific reason, `404` when no active hand) per contracts/local-games-api.md in `backend/tests/contract/local-games.actions.test.ts`
- [ ] T026 [P] [US2] Integration test: play a full hand's actions through every street via the HTTP API and confirm the betting-round/community-card progression matches the engine's expected sequence, in `backend/tests/integration/local-games.betting-flow.test.ts`

### Implementation for User Story 2

- [ ] T027 [US2] Implement `computeLegalActions(handState)` in `backend/src/poker-engine/betting.ts` (depends on T004)
- [ ] T028 [US2] Implement `applyAction(handState, action)` — validates via `computeLegalActions`, updates stacks/`streetContribution`/`totalContribution`/`currentBet`/`minRaiseIncrement`, and advances `seatToAct` — in `backend/src/poker-engine/betting.ts` (depends on T027)
- [ ] T029 [US2] Implement `isRoundComplete(handState)` and the automatic street-advance logic (including the immediate pot award when only one seat remains, FR-008) in `backend/src/poker-engine/engine.ts` (depends on T028, T006)
- [ ] T030 [US2] Implement the `POST /api/local-games/current/actions` route, returning the updated `legalActions` per FR-017, in `backend/src/modules/local-games/local-games.routes.ts` (depends on T029, T017)
- [ ] T031 [P] [US2] Add action-submission controls to `LocalGamePage` — buttons driven by the response's `legalActions`, with the bet/raise amount input constrained to `minBetOrRaise`/`maxBetOrRaise` — in `frontend/src/pages/LocalGamePage.tsx` (depends on T020)

**Checkpoint**: At this point, User Stories 1 AND 2 both work — a full hand's betting can be played through the API

---

## Phase 5: User Story 3 - Reach showdown and award the pot (Priority: P2)

**Goal**: At the end of betting, the engine reveals hole cards, ranks hands, and awards the pot, splitting ties evenly (FR-009, FR-010).

**Independent Test**: Playing a hand with no all-in to the river produces a showdown result with the correct single winner (or an even split on a tie) and the right pot amount awarded.

### Tests for User Story 3 ⚠️

- [ ] T032 [P] [US3] Unit test: `evaluate7CardHand` correctly ranks every standard hand category (high card, pair, two pair, three of a kind, straight, flush, full house, four of a kind, straight flush) from a 7-card set, in `backend/tests/unit/poker-engine/hand-evaluator.test.ts`
- [ ] T033 [P] [US3] Unit test: a tied showdown splits the pot evenly between tied seats, assigning any single leftover chip to the tied seat closest to the left of the dealer (per the documented odd-chip rule), in `backend/tests/unit/poker-engine/hand-evaluator.test.ts`
- [ ] T034 [P] [US3] Integration test: play a full hand with no all-in to showdown via the HTTP API and confirm the winner, revealed hole cards for every non-folded seat, and awarded pot amount are correct, in `backend/tests/integration/local-games.showdown.test.ts`

### Implementation for User Story 3

- [ ] T035 [US3] Implement `evaluate7CardHand(holeCards, communityCards)` (best-of-21-combinations, per research.md) and `compareHandRanks` in `backend/src/poker-engine/hand-evaluator.ts` (depends on T004)
- [ ] T036 [US3] Implement `computePots(handState)` — the general main-pot/side-pot algorithm from each seat's `totalContribution` (data-model.md `Pot`) — in `backend/src/poker-engine/pots.ts` (depends on T004); this same function is exercised further by User Story 4's multi-pot tests
- [ ] T037 [US3] Implement `resolveShowdown(handState)` in `backend/src/poker-engine/engine.ts` (depends on T035, T036): reveals eligible seats' hole cards, ranks each remaining hand, awards each pot (splitting ties per FR-010), and populates `HandState.result`
- [ ] T038 [US3] Ensure `GET /api/local-games/current` includes `pots` and `result` once `bettingRound` is `showdown`/`complete`, per contracts/local-games-api.md, in `backend/src/modules/local-games/local-games.routes.ts` (depends on T037, T019)
- [ ] T039 [P] [US3] Add the showdown/result display (revealed hole cards, hand ranking, winner, pot amounts) to `LocalGamePage` in `frontend/src/pages/LocalGamePage.tsx` (depends on T031)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 are all independently functional — a full hand can be played to a correct result

---

## Phase 6: User Story 4 - All-in with side pots (Priority: P3)

**Goal**: Unequal all-in amounts produce a correct main pot and side pot(s), each awarded only to its eligible seats (FR-009, FR-011).

**Independent Test**: A hand with one short all-in and two full-stack callers produces a main pot (all three eligible) and a side pot (only the two full-stack seats eligible); the short-stacked seat can only win the main pot even with the best hand.

### Tests for User Story 4 ⚠️

- [ ] T040 [P] [US4] Unit test: `computePots` builds a main pot plus side pot(s) with correct amounts and `eligibleSeats` for 3+ seats with unequal `totalContribution` (multiple distinct all-in levels), in `backend/tests/unit/poker-engine/pots.test.ts`
- [ ] T041 [P] [US4] Integration test: when every remaining seat is all-in before the river, the engine automatically deals the rest of the community cards and reaches showdown without requesting further actions (FR-011), in `backend/tests/integration/local-games.all-in.test.ts`

### Implementation for User Story 4

- [ ] T042 [US4] Implement the "every remaining seat is all-in ⇒ auto-deal straight through to showdown" branch in the street-advance logic in `backend/src/poker-engine/engine.ts` (depends on T029, T037)
- [ ] T043 [P] [US4] Add all-in/side-pot indicators (which seats are eligible for each pot) to `LocalGamePage` in `frontend/src/pages/LocalGamePage.tsx` (depends on T039)

**Checkpoint**: All 4 user stories are independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T044 [P] Run every quickstart.md validation scenario end-to-end against a local environment and record results
- [ ] T045 [P] Document the Poker Engine's module boundary (pure, dependency-free) and the `/api/local-games/*` endpoints (including abandon) in `backend/README.md`
- [ ] T046 Security/architecture review pass: confirm no response ever includes another seat's hole cards before showdown or the remaining `deck` (Constitution P4), confirm every action is re-validated server-side regardless of client state (FR-013), and confirm `backend/src/poker-engine/` has zero Express/Prisma/zod imports (Constitution P7)
- [ ] T047 [P] Add unit tests for the all-in-raise vs. partial-all-in-call boundary (raising for exactly the remaining stack vs. calling for less than the amount owed) in `backend/tests/unit/poker-engine/betting.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 and US2 are both P1; US2 (betting) needs a started hand (from US1 or a test fixture) to be independently testable
  - US3 (showdown) needs a hand that reached the river (from US1+US2 or a fixture) to be independently testable
  - US4 (side pots) needs multiple seats with unequal stacks going all-in (from US1+US2, or fixtures) — its core algorithm (`computePots`, T036) is actually implemented in US3 since even the no-all-in case needs a main pot; US4 adds the multi-pot tests and the all-in-before-river auto-skip behavior
- **Polish (Phase 7)**: Depends on all four user stories being complete

### User Story Dependencies

- **User Story 1 (P1 — Start/abandon a hand)**: Can start after Foundational (Phase 2). No dependency on other stories.
- **User Story 2 (P1 — Take a turn)**: Can start after Foundational (Phase 2). Needs a started hand (US1) to be independently testable end-to-end.
- **User Story 3 (P2 — Showdown)**: Can start after Foundational (Phase 2). Needs a hand that reached the river (US1+US2) to be independently testable end-to-end.
- **User Story 4 (P3 — Side pots)**: Can start after Foundational (Phase 2). Needs unequal all-in stacks (US1+US2) and showdown resolution (US3, since `computePots` is implemented there) to be independently testable end-to-end.

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Pure engine functions (`poker-engine/`) before the HTTP route that calls them
- Route before the frontend section that calls it
- Story complete before moving to the next priority

### Parallel Opportunities

- All Setup tasks (T001-T003) and Foundational tasks marked [P] (T005-T010) can run in parallel once T004 lands
- All [P] test tasks within a story (e.g., T011-T015, T021-T026) can be written in parallel
- Frontend `LocalGamePage` sections (T020, T031, T039, T043) touch the same file sequentially by story, but each story's engine/contract/integration tests remain parallel to each other

---

## Parallel Example: User Story 1

```text
# Launch the five US1 tests together:
Task: "Unit test shuffle determinism in backend/tests/unit/poker-engine/deck.test.ts"
Task: "Unit test dealer/blind assignment in backend/tests/unit/poker-engine/engine.test.ts"
Task: "Contract test for POST /api/local-games in backend/tests/contract/local-games.start.test.ts"
Task: "Contract test for GET /api/local-games/current?asSeat= in backend/tests/contract/local-games.state.test.ts"
Task: "Contract test for DELETE /api/local-games/current in backend/tests/contract/local-games.abandon.test.ts"

# Then, once T004/T006 land, engine and frontend work can proceed in parallel:
Task: "Implement engine.startHand() in backend/src/poker-engine/engine.ts"
Task: "Build the initial LocalGamePage in frontend/src/pages/LocalGamePage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks everything)
3. Complete Phase 3: User Story 1 (Start/abandon a hand)
4. **STOP and VALIDATE**: Run T011-T015 and the "start a hand" scenario from quickstart.md independently
5. This alone proves the deck/shuffle/deal/blind-posting core and the per-seat information-hiding rule (the riskiest correctness/security property) work end-to-end

### Incremental Delivery

1. Add Phase 4 (Betting) → validate a full hand's actions can be played through every street → the engine is now actually playable
2. Add Phase 5 (Showdown) → validate a hand reaches a correct result → the engine now produces real outcomes
3. Add Phase 6 (Side pots) → validate the advanced all-in case → full No-Limit Hold'em rule coverage
4. Each phase adds value without breaking the previous ones — stop at any checkpoint and still have a working, demoable slice

### Suggested MVP Scope

**User Story 1 + User Story 2** (both P1) form the smallest end-to-end usable product: a hand can be started and fully played through every betting round. User Story 1 alone proves the deal/blinds/information-hiding but never reaches a concluded hand without User Story 2's betting logic.
