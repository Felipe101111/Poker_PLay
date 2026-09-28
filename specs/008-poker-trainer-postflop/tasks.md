---

description: "Implementation task list for Poker Trainer postflop completo"
---

# Tasks: Poker Trainer postflop completo

**Input**: Design documents from `/specs/008-poker-trainer-postflop/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/trainer-postflop-http.md](contracts/trainer-postflop-http.md), [quickstart.md](quickstart.md)

**Tests**: Required by the specification and constitution. Add focused tests before each story's implementation and run the existing regression suite before completion.

**Organization**: Tasks are grouped by user story. Feature 008 includes flop, turn, and river; no separate Feature 009 is created.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish postflop fixtures, shared vocabulary, and frontend/backend test scaffolding.

- [X] T001 Create postflop backend test fixture helpers for seeded six-player hands, deterministic street snapshots, legal actions, terminal states, and authenticated users in `backend/tests/helpers/trainer-postflop.ts`.
- [X] T002 [P] Add shared postflop street, terminal-reason, board, pot, and scenario projection types in `backend/src/modules/trainer/trainer.types.ts`.
- [X] T003 [P] Add versioned postflop strategy fixture data for flop, turn, and river contexts with mixed actions and unavailable rows under `backend/src/modules/strategy/data/postflop-v1.manifest.json` and `backend/src/modules/strategy/data/postflop-v1.rows.json`.
- [X] T004 [P] Add backend and frontend postflop test file scaffolds at `backend/tests/unit/trainer-postflop.test.ts`, `backend/tests/integration/trainer-postflop.test.ts`, `backend/tests/contract/trainer-postflop.test.ts`, `backend/tests/contract/trainer-postflop-security.test.ts`, `backend/tests/performance/trainer-postflop-performance.test.ts`, and `frontend/tests/trainer-postflop.test.tsx`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish persistence, validation, engine adapters, and authorization boundaries required by every postflop story.

**CRITICAL**: No user-story implementation begins until this phase is complete.

- [X] T005 Extend `TrainingSessionFormat` and the Trainer persistence shape in `backend/src/db/prisma/schema.prisma` and add migration `backend/src/db/prisma/migrations/20260928000500_add_postflop_trainer/migration.sql` for `SIX_MAX_100BB_POSTFLOP`, street, board, pot, and terminal metadata; preserve `sequence` uniqueness and immutable JSON snapshots.
- [X] T006 [P] Update postflop Zod/domain validation in `backend/src/modules/trainer/trainer.validation.ts` so board sizes are exactly 3, 4, or 5 cards for flop, turn, or river, all cards are unique, effective stack is positive, actions require amounts only for bet/raise, and client payloads cannot provide derived board/range/strategy fields.
- [X] T007 [P] Add stable postflop error mappings for missing street, terminal continuation, stale scenario, invalid board state, and unavailable postflop evaluation in `backend/src/shared/errors.ts`.
- [X] T008 Implement server-derived postflop scenario normalization and projection inputs in `backend/src/modules/trainer/trainer.postflop-context.ts`, excluding raw deck, future cards, opponent hole cards, internal seat bookkeeping, and client-controlled strategy data.
- [X] T009 Implement repository primitives for ordered scenario retrieval, current-scenario ownership, one-decision idempotency, terminal completion, and append-only evaluation snapshots in `backend/src/modules/trainer/trainer.repository.ts` and `backend/src/modules/strategy/strategy.snapshot.repository.ts`.
- [X] T010 [P] Add unit tests for postflop card/board validation, projection redaction, terminal metadata, and postflop error mapping in `backend/tests/unit/trainer-postflop.test.ts`.

**Checkpoint**: Postflop persistence, validation, server-derived context, and reusable repository boundaries are ready for user stories.

---

## Phase 3: User Story 1 - Practicar decisiones en el flop (Priority: P1) 🎯 MVP

**Goal**: Start or resume an authenticated postflop session with a valid decision-ready flop and submit one legal, idempotent action.

**Independent Test**: Start a deterministic postflop session, verify exactly three visible board cards and authorized projections, submit every legal action, reject illegal/foreign actions, and verify one persisted decision per scenario.

### Tests for User Story 1

- [X] T011 [P] [US1] Add generator unit tests for deterministic flop creation, unique cards, valid preflop replay, seat/position derivation, visible board size of exactly 3 cards, and server-only opponent state in `backend/tests/unit/trainer-postflop-generator.test.ts`.
- [X] T012 [P] [US1] Add authenticated contract tests for `POST /api/trainer/postflop/session/start` and `GET /api/trainer/postflop/session` in `backend/tests/contract/trainer-postflop.test.ts`, covering projection shape, authentication, resume, and raw-deck/private-card redaction.
- [X] T013 [P] [US1] Add integration tests for seeded flop scenario validity and one active session per user in `backend/tests/integration/trainer-postflop.test.ts`.

### Implementation for User Story 1

- [X] T014 [US1] Implement deterministic preflop replay and decision-ready flop generation using `startHand`, `submitAction`, and existing legal-action computation in `backend/src/modules/trainer/trainer.postflop-generator.ts`; stop on terminal engine states instead of fabricating a flop.
- [X] T015 [US1] Persist postflop session/scenario format, exact 3-card board, pot, street, legal actions, seed, and server-derived context through `backend/src/modules/trainer/trainer.repository.ts` and `backend/src/modules/trainer/trainer.service.ts`.
- [X] T016 [US1] Add authenticated postflop start/resume routes and request validation in `backend/src/modules/trainer/trainer.routes.ts`, preserving user ownership and existing preflop route behavior.
- [X] T017 [US1] Extend response projection with street, board, pot, terminal metadata, and authorized flop scenario fields in `backend/src/modules/trainer/trainer.projection.ts` and `backend/src/modules/trainer/trainer.types.ts`.
- [X] T018 [US1] Add postflop session start/resume client methods and render the flop board, pot, legal actions, loading, authorization, and unavailable states in `frontend/src/services/trainerApi.ts`, `frontend/src/pages/TrainerPage.tsx`, and `frontend/tests/trainer-postflop.test.tsx`.
- [X] T019 [US1] Implement legal flop decision submission with stored-scenario validation and one effective decision per user/scenario in `backend/src/modules/trainer/trainer.service.ts` and `backend/src/modules/trainer/trainer.repository.ts`.

**Checkpoint**: An authenticated user can independently start, inspect, refresh, and resolve a valid flop decision without exposing hidden state.

---

## Phase 4: User Story 2 - Continuar por turn y river (Priority: P1)

**Goal**: Advance the same training sequence from flop to turn to river only after persisted decisions, and stop cleanly on terminal hands.

**Independent Test**: Complete deterministic flop and turn decisions, verify exact board sizes of 3, 4, and 5 cards, confirm ordered scenarios and recalculated legal actions, and verify fold/all-in/showdown prevents later streets.

### Tests for User Story 2

- [X] T020 [P] [US2] Add unit tests for `flop -> turn -> river` transition, board uniqueness, action replay, recalculated legal actions, and terminal fold/all-in/showdown behavior in `backend/tests/unit/trainer-postflop-transition.test.ts`.
- [X] T021 [P] [US2] Add contract tests for `POST /api/trainer/postflop/session/next` in `backend/tests/contract/trainer-postflop.test.ts`, covering missing decision, stale decision, next street, terminal result, and repeated request behavior.
- [X] T022 [P] [US2] Add integration tests for ordered sequence persistence, concurrent continuation, new seed/sequence, and unchanged active scenario after failed continuation in `backend/tests/integration/trainer-postflop.test.ts`.

### Implementation for User Story 2

- [X] T023 [US2] Implement immutable continuation from the accepted engine snapshot using `submitAction` and street transitions in `backend/src/modules/trainer/trainer.postflop-generator.ts`, producing exactly 4 board cards on turn and 5 on river.
- [X] T024 [US2] Implement transactional `continuePostflopSession` that persists the completed decision before creating the next scenario and refuses continuation without the current decision in `backend/src/modules/trainer/trainer.repository.ts`.
- [X] T025 [US2] Implement terminal-state handling for fold, all-in, showdown, and complete hands, including `terminalReason`, terminal result projection, and no fabricated next scenario in `backend/src/modules/trainer/trainer.service.ts`.
- [X] T026 [US2] Add the postflop continuation route and response envelope from `contracts/trainer-postflop-http.md` in `backend/src/modules/trainer/trainer.routes.ts`.
- [X] T027 [US2] Render turn/river continuation, terminal result, stale/missing-decision errors, refresh recovery, and disabled transition controls in `frontend/src/pages/TrainerPage.tsx` and `frontend/src/services/trainerApi.ts`.

**Checkpoint**: A user can complete a continuous flop-turn-river sequence or receive a truthful terminal result when the hand ends early.

---

## Phase 5: User Story 3 - Entender equity, rangos y estrategia por calle (Priority: P1)

**Goal**: Evaluate each postflop action with separate exact equity, blockers/ranges, versioned strategy, mixed frequencies, assumptions, and explicit limitations.

**Independent Test**: Evaluate flop, turn, and river contexts with available strategy, missing strategy, blocked ranges, and insufficient holdings; verify the response never fabricates advice and preserves calculation metadata.

### Tests for User Story 3

- [X] T028 [P] [US3] Add evaluator unit tests for flop/turn/river context derivation, exact equity, blocked combos, multiway limitations, mixed-frequency classification, and `UNAVAILABLE` strategy in `backend/tests/unit/trainer-postflop-evaluation.test.ts`.
- [X] T029 [P] [US3] Add contract tests for separated equity/strategy response fields, unavailable rows, invalid derived inputs, and client attempts to override board/ranges/method/precision/version in `backend/tests/contract/trainer-postflop.test.ts`.
- [X] T030 [P] [US3] Add integration tests for postflop strategy version lookup, historical row snapshots, fingerprints, and equity/strategy independence in `backend/tests/integration/trainer-postflop-evaluation.test.ts`.

### Implementation for User Story 3

- [X] T031 [US3] Extend `EvaluationContext` and the server-derived adapter in `backend/src/modules/trainer/trainer.evaluation-context.ts` to include street, board, pot, prior actions, effective stack, legal context, and postflop strategy key without exposing private opponent cards.
- [X] T032 [US3] Add postflop strategy manifest loading and context-key resolution for street, position, table size, stack assumptions, and action history in `backend/src/modules/strategy/strategy.service.ts` and `backend/src/modules/strategy/data/`.
- [X] T033 [US3] Extend Trainer evaluation orchestration in `backend/src/modules/trainer/trainer.evaluation.ts` to call Equity Engine and Strategy Engine independently, preserve exact method/precision/fingerprint/blockers, and emit explicit limitations instead of approximations.
- [X] T034 [US3] Persist decision explanation and append-only `EvaluationSnapshot` data atomically with strategy version, row, equity, classification, availability, calculation fingerprint, and limitations in `backend/src/modules/trainer/trainer.service.ts`, `backend/src/modules/trainer/trainer.repository.ts`, and `backend/src/modules/strategy/strategy.snapshot.repository.ts`.
- [X] T035 [US3] Extend postflop decision projection and frontend rendering with separate equity, range/blocker metadata, strategy frequencies, assumptions, version, unavailable state, and limitations in `backend/src/modules/trainer/trainer.projection.ts`, `frontend/src/services/trainerApi.ts`, and `frontend/src/pages/TrainerPage.tsx`.

**Checkpoint**: Each street produces an auditable quantitative result and an independent strategic result, with no fabricated recommendations.

---

## Phase 6: User Story 4 - Revisar explicaciones acumuladas (Priority: P2)

**Goal**: Recover the ordered flop/turn/river decisions and explanations for the active training sequence without exposing unauthorized history.

**Independent Test**: Complete several streets, reload the session, verify ordered results and original strategy/equity snapshots, then publish a new strategy version and confirm old results do not change.

### Tests for User Story 4

- [X] T036 [P] [US4] Add authenticated contract tests for ordered postflop resume and historical decision projection in `backend/tests/contract/trainer-postflop-history.test.ts`.
- [X] T037 [P] [US4] Add integration tests for multi-street recovery, immutable snapshots after strategy publication, cross-user ownership, and refresh during continuation in `backend/tests/integration/trainer-postflop-history.test.ts`.
- [X] T038 [P] [US4] Add frontend tests for ordered explanations, street labels, previous-result retention, terminal review, refresh recovery, keyboard controls, and privacy-safe rendering in `frontend/tests/trainer-postflop.test.tsx`.

### Implementation for User Story 4

- [X] T039 [US4] Implement ordered scenario/decision retrieval and latest-sequence projection for postflop sessions in `backend/src/modules/trainer/trainer.repository.ts`, `backend/src/modules/trainer/trainer.service.ts`, and `backend/src/modules/trainer/trainer.projection.ts`.
- [X] T040 [US4] Add cumulative street explanation fields linking board changes, position, stack, pot, prior actions, range/blocker constraints, and limitations in `backend/src/modules/trainer/trainer.evaluation.ts` and `backend/src/modules/trainer/trainer.types.ts`.
- [X] T041 [US4] Render the ordered postflop review and recovery experience without implementing Feature 010 general hand history in `frontend/src/pages/TrainerPage.tsx` and `frontend/src/pages/TrainerProgressPage.tsx`.

**Checkpoint**: Completed postflop decisions remain reviewable in order and preserve their original evaluation data.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate security, compatibility, performance, documentation, and the complete quickstart.

- [X] T042 [P] Add security regression coverage for forged boards/ranges/strategy versions, future-card leakage, raw deck access, opponent private cards, foreign sessions, and cross-user snapshots in `backend/tests/contract/trainer-postflop-security.test.ts`.
- [X] T043 [P] Add representative flop/turn/river exact-equity performance coverage with p50, p95, runout counts, and memory observations in `backend/tests/performance/trainer-postflop-performance.test.ts`.
- [X] T044 [P] Add Feature 006 regression coverage proving preflop session start, decision idempotency, continuation, projection redaction, and progress behavior remain unchanged in `backend/tests/contract/trainer-postflop-regression.test.ts`.
- [X] T045 Update `backend/README.md` and `README.md` with postflop setup, street sequence, terminal behavior, strategy availability, privacy boundary, and the Feature 010–014 roadmap in `specs/008-poker-trainer-postflop/quickstart.md`.
- [X] T046 Run Prisma validation/migration deploy, focused postflop tests, complete backend/frontend suites, builds, security scenarios, and the p95 target from `specs/008-poker-trainer-postflop/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; establishes fixtures, types, datasets, and test files.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational; delivers the MVP decision-ready flop.
- **User Story 2 (Phase 4)**: Depends on US1 scenario persistence and legal decision submission; delivers turn/river continuation.
- **User Story 3 (Phase 5)**: Depends on Foundational, Feature 007, and US1 context; can be developed in parallel with US2 using deterministic fixtures.
- **User Story 4 (Phase 6)**: Depends on US1–US3 persisted decisions and snapshots.
- **Polish (Phase 7)**: Depends on all desired stories.

### User Story Dependencies

- **US1 (P1)**: Foundational only; independently delivers a valid flop scenario and decision.
- **US2 (P1)**: US1 decision persistence; independently validates street transitions and terminal behavior.
- **US3 (P1)**: Foundational plus Feature 007 equity/strategy services; independently validates evaluation with fixture scenarios.
- **US4 (P2)**: US1, US2, and US3; independently validates ordered recovery and immutable explanations.

### Parallel Opportunities

- T002–T004 can run in parallel during Setup.
- T006–T008 and T010 can run in parallel after the persistence shape in T005 is agreed.
- T011–T013 can run in parallel before US1 implementation.
- T020–T022 can run in parallel before US2 implementation.
- T028–T030 can run in parallel before US3 implementation.
- T036–T038 can run in parallel before US4 implementation.
- T042–T045 can run in parallel after the story contracts stabilize.
- US2 and US3 can be staffed in parallel after US1 and Foundational are complete.

### Parallel Example: User Story 1

```text
Task: Add generator unit tests in backend/tests/unit/trainer-postflop-generator.test.ts
Task: Add start/resume contract tests in backend/tests/contract/trainer-postflop.test.ts
Task: Add seeded scenario integration tests in backend/tests/integration/trainer-postflop.test.ts
```

### Parallel Example: User Story 2

```text
Task: Add transition unit tests in backend/tests/unit/trainer-postflop-transition.test.ts
Task: Add continuation contract tests in backend/tests/contract/trainer-postflop.test.ts
Task: Add sequence/concurrency integration tests in backend/tests/integration/trainer-postflop.test.ts
```

### Parallel Example: User Story 3

```text
Task: Add evaluator unit tests in backend/tests/unit/trainer-postflop-evaluation.test.ts
Task: Add separated-result contract tests in backend/tests/contract/trainer-postflop.test.ts
Task: Add strategy snapshot integration tests in backend/tests/integration/trainer-postflop-evaluation.test.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Complete US1 deterministic flop generation, authenticated projection, legal decision validation, and idempotent persistence.
3. Run US1 unit, contract, integration, backend build, and frontend tests.
4. Stop at the MVP checkpoint for a usable postflop-flop demo.

### Incremental Delivery

1. Add US2 turn/river continuation and terminal states.
2. Add US3 exact equity, blockers, strategy versions, mixed frequencies, and unavailable behavior.
3. Add US4 ordered explanations and recovery.
4. Complete security, regression, performance, documentation, and full quickstart validation.
5. Do not create Feature 009 separately; its turn/river scope is part of Feature 008.

## Notes

- Every task uses `- [ ] T###`, includes a file path, and includes `[US#]` only in user-story phases.
- `[P]` marks tasks that can be worked on independently without incomplete-file dependencies.
- The server remains authoritative for poker rules, state transitions, cards, board, ranges, equity, strategy, and projections.
- Feature 010 owns general hand history; Feature 011 owns tournaments; Feature 012 owns advanced statistics; Feature 013 owns operational security; Feature 014 owns broad UI polish.
