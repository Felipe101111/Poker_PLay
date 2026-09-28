---

description: "Implementation task list for Poker Trainer Preflop Decisions"
---

# Tasks: Poker Trainer Preflop Decisions

**Input**: Design documents from `/specs/006-poker-trainer/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/trainer-http.md](contracts/trainer-http.md), [quickstart.md](quickstart.md)

**Tests**: Required by the project constitution and feature acceptance criteria. Add tests before implementation for each user-story slice.

**Organization**: Tasks are grouped by user story. The first story is the MVP and later stories extend it without changing the meaning of persisted records.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the trainer module, bounded strategy dataset, and source/test scaffolding.

- [X] T001 Create the backend trainer module files `backend/src/modules/trainer/trainer.types.ts`, `trainer.validation.ts`, `trainer.repository.ts`, `trainer.service.ts`, `trainer.routes.ts`, `trainer.generator.ts`, `trainer.strategy.ts`, and `trainer.projection.ts`.
- [X] T002 [P] Create the frontend trainer service and page scaffolding in `frontend/src/services/trainerApi.ts`, `frontend/src/pages/TrainerPage.tsx`, and `frontend/tests/trainer.test.tsx`.
- [X] T003 [P] Add the bounded versioned strategy dataset and documented assumptions under `backend/src/modules/trainer/data/preflop-strategy.v1.json` and `backend/src/modules/trainer/data/README.md`.
- [X] T004 [P] Add trainer test fixture helpers for authenticated users, deterministic seeds, supported strategy rows, unsupported rows, and six-player scenarios in `backend/tests/helpers/trainer.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement persistence, ownership, validation, engine boundaries, and routing required by every user story.

**Critical**: No user-story implementation begins until this phase is complete.

- [X] T005 Add `TrainingSession`, `TrainingScenario`, and `TrainingDecision` models, enums, relations, required fields, and indexes to `backend/src/db/prisma/schema.prisma`, preserving the data-model constraints including `format = SIX_MAX_100BB_PREFLOP`, positive effective stack, immutable strategy snapshots, and unique scenario/user/request identities.
- [X] T006 [P] Create the versioned migration `backend/src/db/prisma/migrations/20260926000300_add_poker_trainer/migration.sql`, including foreign keys, JSON snapshot columns, enum values, non-negative/positive-value checks, and the partial unique index enforcing one `ACTIVE` session per `user_id`.
- [X] T007 [P] Add stable trainer error codes and HTTP mappings in `backend/src/shared/errors.ts` for `TRAINING_SESSION_NOT_FOUND`, `TRAINING_ACCESS_DENIED`, `SCENARIO_NOT_FOUND`, `ILLEGAL_TRAINING_ACTION`, `DUPLICATE_TRAINING_DECISION`, and `STRATEGY_UNAVAILABLE`.
- [X] T008 Implement Zod validation in `backend/src/modules/trainer/trainer.validation.ts` for the optional default format, scenario/request IDs, legal action types, positive amount values, and next-scenario request payloads.
- [X] T009 Implement the server-authoritative seeded scenario generator in `backend/src/modules/trainer/trainer.generator.ts` using the existing Poker Engine `startHand` API, fixed six-player/100 BB format, unique cards, preflop-only state, coherent prior actions, and persisted `generationSeed`; never return raw deck or opponent private cards.
- [X] T010 Implement repository transaction helpers in `backend/src/modules/trainer/trainer.repository.ts` for one-active-session creation/retrieval, immutable scenario creation, user-scoped lookup, idempotent decision insert/read, atomic next-scenario creation, and progress aggregates.
- [X] T011 Implement the strategy dataset loader and lookup contract in `backend/src/modules/trainer/trainer.strategy.ts`, including dataset version, canonical strategy key, mixed action frequencies, documented assumptions, and explicit `UNAVAILABLE` for missing rows.
- [X] T012 Implement trainer domain types and per-user response projection in `backend/src/modules/trainer/trainer.types.ts` and `backend/src/modules/trainer/trainer.projection.ts`, ensuring engine snapshots, raw decks, future boards, and other-player private data cannot cross the API boundary.
- [X] T013 Register `trainerRouter` under `/api/trainer` in `backend/src/app.ts` and apply the existing session authentication middleware to all trainer routes.
- [X] T014 Add foundational schema, generator, strategy, projection, and ownership tests in `backend/tests/unit/trainer-generator.test.ts`, `backend/tests/unit/trainer-strategy.test.ts`, and `backend/tests/unit/trainer-projection.test.ts`.

**Checkpoint**: The database, seeded engine boundary, strategy lookup, authentication boundary, and projection are ready for story-specific flows.

- [X] T015 [US1] Add session contract tests for start/resume, authentication, and projected scenario shape in `backend/tests/contract/trainer-session.test.ts`.


**Goal**: An authenticated player receives one complete, valid, reproducible six-player preflop scenario and can resume it safely.

- [X] T016 [P] [US1] Add integration tests for concurrent session starts and seeded scenario validity in `backend/tests/integration/trainer-session.test.ts`, proving one active session per user and unique cards/coherent preflop action history.
- [X] T017 [P] [US1] Add frontend tests in `frontend/tests/trainer.test.tsx` for loading, scenario rendering, legal action display, session resume, and unavailable/error states.

### Implementation for User Story 1

- [X] T018 [US1] Implement `startOrResumeSession` and `getCurrentSession` in `backend/src/modules/trainer/trainer.service.ts`, returning an existing active session unchanged and creating a new seeded scenario transactionally when none exists.
- [X] T019 [US1] Implement `POST /api/trainer/session/start` and `GET /api/trainer/session` in `backend/src/modules/trainer/trainer.routes.ts` using the HTTP shapes in `specs/006-poker-trainer/contracts/trainer-http.md`.
- [X] T020 [US1] Implement the trainer API client in `frontend/src/services/trainerApi.ts` for start/resume and current-session requests with existing session credentials and API error handling.
- [X] T021 [US1] Implement the scenario presentation page in `frontend/src/pages/TrainerPage.tsx`, rendering only projected hole cards, position, stack, blinds, prior actions, legal actions, loading, authorization, and unavailable states.
- [X] T022 [US1] Register the authenticated trainer route in `frontend/src/App.tsx` and add navigation from the existing frontend shell without exposing another player's session.

**Checkpoint**: US1 is independently demoable: one authenticated player can start, inspect, refresh, and resume a valid preflop scenario.

---

## Phase 4: User Story 2 - Submit a Preflop Decision (Priority: P1)

**Goal**: A player submits one legal action and receives a contextual, mixed-strategy-aware, idempotent evaluation.

**Independent Test**: Submit every legal action for a deterministic scenario, reject illegal/foreign actions, retry an accepted request, and verify exactly one immutable decision and stable evaluation.

### Tests for User Story 2

- [X] T023 [P] [US2] Add contract tests for `POST /api/trainer/session/decisions` in `backend/tests/contract/trainer-decisions.test.ts`, covering legal actions, malformed/illegal actions, foreign scenarios, mixed frequencies, unavailable strategy, stable errors, and duplicate request IDs.
- [X] T024 [P] [US2] Add concurrency integration tests in `backend/tests/integration/trainer-decisions.test.ts` proving concurrent submissions for one scenario create at most one decision and cannot replace a completed evaluation.
- [X] T025 [P] [US2] Add evaluator unit tests in `backend/tests/unit/trainer-evaluator.test.ts` for preferred, `ACCEPTABLE_MIXED`, `MARGINAL`, `SIGNIFICANT_DEVIATION`, and `UNAVAILABLE` outcomes with explanation factors.

### Implementation for User Story 2

- [X] T026 [US2] Implement server-side decision evaluation in `backend/src/modules/trainer/trainer.service.ts`, validating scenario ownership and legal action against the stored engine snapshot before strategy lookup, and producing category/frequency/explanation snapshots without client authority.
- [X] T027 [US2] Implement atomic idempotent decision persistence in `backend/src/modules/trainer/trainer.repository.ts`, enforcing unique `(scenarioId, userId)` and `(scenarioId, userId, requestId)` behavior and returning the original result on retry.
- [X] T028 [US2] Implement `POST /api/trainer/session/decisions` in `backend/src/modules/trainer/trainer.routes.ts`, mapping validation, ownership, illegal-action, duplicate, and unavailable-strategy outcomes to documented response envelopes.
- [X] T029 [US2] Add decision submission and result rendering to `frontend/src/services/trainerApi.ts` and `frontend/src/pages/TrainerPage.tsx`, disabling unavailable actions from server legal-actions data and never applying optimistic game-state changes.

**Checkpoint**: US1 and US2 are independently testable: a player can start a scenario, submit one action, inspect a defensible result, and retry safely.

---

## Phase 5: User Story 3 - Understand the Result and Continue Practice (Priority: P2)

**Goal**: A player sees an educational result, retains it, and receives a fresh scenario only after the result is committed.

**Independent Test**: Complete a deterministic scenario, verify recommendation frequencies/factors and unavailable behavior, request the next scenario, and recover the latest result after leaving and returning.

### Tests for User Story 3

- [X] T030 [P] [US3] Add contract tests for `POST /api/trainer/session/next` and resumed-result responses in `backend/tests/contract/trainer-continuation.test.ts`, covering atomic result retention, new scenario creation, retries, and recovery after interruption.
- [X] T031 [P] [US3] Add lifecycle integration tests in `backend/tests/integration/trainer-continuation.test.ts`, proving a previous decision remains immutable, a new scenario has a new seed/sequence, and failed continuation leaves the active scenario unchanged.
- [X] T032 [P] [US3] Add result/continuation UI tests in `frontend/tests/trainer.test.tsx` for preferred, mixed, marginal, significant-deviation, unavailable, next-scenario, refresh, and closed-session states.

### Implementation for User Story 3

- [X] T033 [US3] Implement educational explanation composition and immutable result projection in `backend/src/modules/trainer/trainer.service.ts` and `backend/src/modules/trainer/trainer.projection.ts`, including factors for position, effective stack, prior action, blinds, and selected-action role.
- [X] T034 [US3] Implement atomic `continueSession` in `backend/src/modules/trainer/trainer.service.ts` and `backend/src/modules/trainer/trainer.repository.ts`, persisting the completed decision before creating the next seeded scenario.
- [X] T035 [US3] Implement `POST /api/trainer/session/next` in `backend/src/modules/trainer/trainer.routes.ts` and return the completed result plus fresh active scenario per `specs/006-poker-trainer/contracts/trainer-http.md`.
- [X] T036 [US3] Complete result, continuation, and recovery views in `frontend/src/pages/TrainerPage.tsx`, preserving the previous result while showing the next scenario only after server acknowledgment.

**Checkpoint**: US3 is independently testable: every completed result remains reviewable and continuation is atomic and recoverable.

---

## Phase 6: User Story 4 - Review Personal Training Progress (Priority: P3)

**Goal**: A player sees accurate, user-scoped counts of completed decisions and strategic categories, including an explicit empty state.

**Independent Test**: Complete decisions across categories for two users, compare each progress response, and verify unavailable decisions do not inflate strategic categories.

### Tests for User Story 4

- [X] T037 [P] [US4] Add progress contract tests for `GET /api/trainer/progress` in `backend/tests/contract/trainer-progress.test.ts`, covering authenticated user scope, category/action counts, unavailable counts, and zero-history empty state.
- [X] T038 [P] [US4] Add progress integration tests in `backend/tests/integration/trainer-progress.test.ts` proving aggregates remain correct after multiple sessions and never expose another user's decisions.
- [X] T039 [P] [US4] Add progress UI tests in `frontend/tests/trainer-progress.test.tsx` for populated counts, unavailable count, empty state, loading, and authorization errors.

### Implementation for User Story 4

- [X] T040 [US4] Implement user-scoped progress aggregation in `backend/src/modules/trainer/trainer.repository.ts` and `backend/src/modules/trainer/trainer.service.ts`, counting evaluated categories only and separating `unavailable` decisions.
- [X] T041 [US4] Implement `GET /api/trainer/progress` in `backend/src/modules/trainer/trainer.routes.ts` with the documented progress response and explicit empty-state indicator.
- [X] T042 [US4] Add progress API methods and a progress view in `frontend/src/services/trainerApi.ts` and `frontend/src/pages/TrainerProgressPage.tsx`.
- [X] T043 [US4] Register the progress route and trainer navigation in `frontend/src/App.tsx` and the existing navigation component/page.

**Checkpoint**: US4 is independently testable: progress is accurate, user-scoped, and meaningful for both populated and empty accounts.

---

## Phase 7: Polish and Cross-Cutting Concerns

**Purpose**: Harden security, accessibility, observability, documentation, and end-to-end validation.

- [X] T044 [P] Add authorization/security regression coverage in `backend/tests/contract/trainer-security.test.ts` for forged user IDs, foreign scenario IDs, raw engine/deck reads, malformed payloads, and cross-user progress access.
- [X] T045 [P] Add accessibility and error-state coverage in `frontend/tests/trainer.test.tsx` for keyboard-operable actions, readable result/status text, loading, unavailable strategy, and authorization errors.
- [X] T046 [P] Add trainer operational logging in `backend/src/modules/trainer/trainer.service.ts` for session starts, decision latency, stale/duplicate submissions, unavailable strategy, and projection failures without logging private cards or credentials.
- [X] T047 Update `backend/README.md` and `README.md` with trainer setup, bounded dataset versioning, privacy boundary, session recovery, and quickstart commands from `specs/006-poker-trainer/quickstart.md`.
- [X] T048 Run the complete validation sequence in `specs/006-poker-trainer/quickstart.md`, including backend/frontend tests and builds, migration deployment, security scenarios, and the 95th-percentile session-start measurement.

---

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No feature dependency; creates the module/data/test scaffolding.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational; this is the MVP.
- **US2 (Phase 4)**: Depends on US1 scenario ownership/projection and Foundational persistence.
- **US3 (Phase 5)**: Depends on US2 decision persistence/evaluation.
- **US4 (Phase 6)**: Depends on persisted decisions from US2 and completed lifecycle from US3.
- **Polish (Phase 7)**: Depends on all desired stories.

### User Story Dependencies

- **US1 (P1)**: Foundational only; independently deliverable.
- **US2 (P1)**: Foundational plus US1 active scenario contract; independently validates decision mutation.
- **US3 (P2)**: US2 decision result; independently validates continuation and recovery.
- **US4 (P3)**: US2 persisted decisions; independently validates aggregates with seeded fixtures.

### Parallel Opportunities

- Setup tasks T002-T004 can run in parallel after module naming is agreed.
- Foundational tasks T006-T008 and T014 can run in parallel with T005/T009 once shared types are stable.
- Within each story, contract, integration, and UI tests marked `[P]` can be authored in parallel before implementation.
- US1 frontend work can proceed in parallel with US1 backend tests after the HTTP contract is fixed.
- US2 evaluator tests and contract tests can proceed in parallel with repository idempotency work.
- US3 UI tests and lifecycle tests can proceed in parallel.
- US4 progress tests can proceed in parallel with progress UI work once the aggregate response is fixed.

### Parallel Example: User Story 1

```text
Task: Add backend session contract tests in backend/tests/contract/trainer-session.test.ts
Task: Add seeded-session integration tests in backend/tests/integration/trainer-session.test.ts
Task: Add trainer page tests in frontend/tests/trainer.test.tsx
Task: Implement trainer API client in frontend/src/services/trainerApi.ts
```

### Parallel Example: User Story 2

```text
Task: Add decision contract tests in backend/tests/contract/trainer-decisions.test.ts
Task: Add decision concurrency tests in backend/tests/integration/trainer-decisions.test.ts
Task: Add evaluator unit tests in backend/tests/unit/trainer-evaluator.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup and Foundational phases.
2. Complete US1 seeded generation, authenticated session endpoints, projection, and page.
3. Run the US1 contract/integration/UI tests and the quickstart scenario for start/resume.
4. Stop for a usable demo before adding decision evaluation.

### Incremental Delivery

1. Add US2 decision evaluation and idempotency; validate legal, mixed, unavailable, and duplicate actions.
2. Add US3 immutable results and atomic continuation; validate recovery.
3. Add US4 personal progress and empty state.
4. Complete Polish tasks and full quickstart validation.

## Notes

- Every task has a sequential ID, checkbox, exact repository path, and required story label for user-story phases.
- `[P]` marks only tasks that can be worked on independently without incomplete-file dependencies.
- Keep the server authoritative: clients submit intent and render projections; they never generate cards, decide legality, or calculate progress.
