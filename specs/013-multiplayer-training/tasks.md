# Tasks: Entrenamiento multijugador

**Input**: Design documents from `/specs/013-multiplayer-training/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included because the feature specification requires measurable privacy, concurrency, idempotency, reconnection, evaluation, and regression validation.

**Organization**: Tasks are grouped by user story so each increment is independently testable.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the existing multiplayer, Trainer, evaluation, history, and frontend test boundaries without creating a second poker engine.

- [ ] T001 Create the Feature 013 source and test file placeholders under `backend/src/modules/multiplayer/`, `backend/tests/contract/`, `backend/tests/integration/`, `backend/tests/security/`, `backend/tests/performance/`, `frontend/src/pages/`, `frontend/src/services/`, and `frontend/tests/` according to [plan.md](plan.md).
- [ ] T002 [P] Add shared Feature 013 fixture builders for started rooms, multiplayer tables, enrolled participants, accepted actions, strategy availability, and terminal hands in `backend/tests/fixtures/multiplayer-training.ts`.
- [ ] T003 [P] Add stable Feature 013 test constants and request factories for room ids, hand ids, request ids, and privacy-sensitive payload attempts in `backend/tests/helpers/multiplayer-training.ts`.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish persistence, authorization, privacy, evaluation boundaries, and transaction primitives required by every user story.

**CRITICAL**: User story work starts only after this phase is complete.

- [X] T004 Extend `backend/src/db/prisma/schema.prisma` with `MultiplayerTrainingSession`, `MultiplayerTrainingParticipant`, and `MultiplayerTrainingDecision`; enforce one training session per table, unique `(trainingSessionId, tableParticipantId)`, unique `(trainingSessionId, userId)`, unique `tableActionId`, immutable decision snapshots, and terminal statuses `ACTIVE`, `COMPLETED`, and `CANCELLED` from `data-model.md`.
- [X] T005 Extend `backend/src/db/prisma/schema.prisma` and `backend/src/db/prisma/migrations/` with the optional relation/source metadata for `EvaluationSnapshot`, preserving existing individual Trainer snapshots and the rule that evaluation snapshots retain user id, context, equity, strategy, availability, limitations, and calculation fingerprint.
- [X] T006 Generate and validate the Prisma migration in `backend/src/db/prisma/migrations/` without changing existing `MultiplayerTable`, `MultiplayerHand`, `TableAction`, `TrainingSession`, `TrainingDecision`, `EvaluationSnapshot`, or `HandHistory` data semantics.
- [X] T007 [P] Define Feature 013 domain types, status values, action context, decision feedback, and API response shapes in `backend/src/modules/multiplayer/multiplayer.training.types.ts`; represent evaluation as `EVALUATED` or explicit `UNAVAILABLE` and never as an invented recommendation.
- [X] T008 [P] Define Zod schemas and stable validation errors in `backend/src/modules/multiplayer/multiplayer.training.validation.ts` for create-or-join mode, bounded decision filters, leave requests, server-owned fields, and message/action rate and size limits; reject client-supplied user, seat, cards, board, stack, strategy, equity, category, and snapshot values.
- [ ] T009 Implement repository transaction helpers in `backend/src/modules/multiplayer/multiplayer.training.repository.ts` for create-or-find session, enroll participant, leave participant, find caller-owned decisions, create decision once per accepted `TableAction`, and complete training idempotently.
- [X] T010 Implement participant-scoped projection helpers in `backend/src/modules/multiplayer/multiplayer.training.projection.ts` that remove opponent cards, raw deck, engine snapshots, other users' decisions, and private evaluation payloads before serialization.
- [ ] T011 Harden the existing multiplayer transaction path in `backend/src/modules/multiplayer/multiplayer.service.ts` and `backend/src/modules/multiplayer/multiplayer.repository.ts` so action deduplication is scoped to `(handId, userId, requestId)`, table and hand versions cannot diverge, eliminated participants cannot reconnect as active players, and terminal tables clear `currentHandId` consistently.
- [ ] T012 [P] Add authorization and error mapping for training membership boundaries in `backend/src/modules/multiplayer/multiplayer.training.errors.ts` and `backend/src/shared/errors.ts`, including `TRAINING_NOT_FOUND`, `TRAINING_ACCESS_DENIED`, `TRAINING_CLOSED`, `TRAINING_PARTICIPANT_LEFT`, `TRAINING_DECISION_NOT_FOUND`, and `TRAINING_FEEDBACK_UNAVAILABLE`.
- [ ] T013 [P] Add foundational contract assertions for table projection redaction, authenticated identity resolution, and rejected client-owned fields in `backend/tests/security/multiplayer-training-foundation.security.test.ts`.

**Checkpoint**: Schema, migration, typed boundaries, participant-scoped projection, multiplayer invariants, and fixtures are ready; user stories can proceed independently.

## Phase 3: User Story 1 - Crear y unirse a una sesión de entrenamiento (Priority: P1) 🎯 MVP

**Goal**: Allow authenticated members of a started room to create or join one training overlay without changing table membership or exposing private data.

**Independent Test**: Two room members create/join training, receive their own enrolled participant state, and a non-member or full-room user is rejected without session or private-table disclosure.

### Tests for User Story 1

- [ ] T014 [P] [US1] Add HTTP contract tests for `POST /api/rooms/:roomId/training`, `GET /api/rooms/:roomId/training`, and `POST /api/rooms/:roomId/training/leave` in `backend/tests/contract/multiplayer-training-enrollment.contract.test.ts`.
- [ ] T015 [P] [US1] Add integration tests for create-or-join idempotency, one session per table, participant enrollment, capacity rejection, and leave-without-folding in `backend/tests/integration/multiplayer-training-enrollment.integration.test.ts`.
- [ ] T016 [P] [US1] Add security tests for non-members, unauthenticated callers, forged user/seat/table identifiers, and private enrollment redaction in `backend/tests/security/multiplayer-training-enrollment.security.test.ts`.

### Implementation for User Story 1

- [ ] T017 [US1] Implement authenticated enrollment, readiness/start gating, and leave service operations in `backend/src/modules/multiplayer/multiplayer.training.service.ts`, resolving identity and seat only from the session and persisted room/table membership and rejecting hand start until the configured minimum participants and room preparation conditions are met.
- [X] T018 [US1] Implement enrollment, current-state, decision-list, and leave routes in `backend/src/modules/multiplayer/multiplayer.training.routes.ts` according to `contracts/multiplayer-training-http.md`, preserving existing table action routes.
- [X] T019 [US1] Register the training routes in `backend/src/app.ts` and add authenticated route error handling without exposing whether an inaccessible private training session exists.
- [X] T020 [US1] Implement `training:join` and `training:leave` socket events in `backend/src/modules/multiplayer/multiplayer.training.socket.ts`, using the existing authenticated multiplayer socket and participant-scoped acknowledgements.
- [X] T021 [P] [US1] Add typed enrollment, current-training, decision-list, and leave methods in `frontend/src/services/multiplayerTrainingApi.ts`, preserving server error codes and table state versions.
- [X] T022 [US1] Add the protected enrollment state and controls around the existing table flow in `frontend/src/pages/MultiplayerTrainingPage.tsx`, including loading, full-room, denied, left, closed, and recoverable-error states.
- [ ] T023 [P] [US1] Add React Testing Library coverage for enrollment, idempotent join, leave without table fold, unauthorized state, and absence of another participant's training data in `frontend/tests/multiplayer-training-enrollment.test.tsx`.

**Checkpoint**: US1 is independently usable: authorized room members can enroll or leave training, while the table remains intact and private boundaries hold.

## Phase 4: User Story 2 - Jugar una mano con información privada correcta (Priority: P1)

**Goal**: Capture accepted actions during a shared hand while preserving server-authoritative rules, per-user projections, idempotency, and realtime consistency.

**Independent Test**: Enrolled players execute valid and invalid actions, observe the same authorized public table state, keep opponent cards hidden, and cannot create duplicate transitions through retries or concurrent requests.

### Tests for User Story 2

- [ ] T024 [P] [US2] Add contract tests for the existing table action HTTP and realtime contracts with enrolled training participants in `backend/tests/contract/multiplayer-training-actions.contract.test.ts`.
- [ ] T025 [P] [US2] Add integration tests for valid actions, out-of-turn rejection, stale versions, concurrent same-turn requests, duplicate request ids, street progression, and table completion in `backend/tests/integration/multiplayer-training-actions.integration.test.ts`.
- [ ] T026 [P] [US2] Add security tests for forged actor, seat, amount, cards, board, stack, and training-session fields plus opponent-card and raw-deck leakage in `backend/tests/security/multiplayer-training-actions.security.test.ts`.
- [ ] T027 [P] [US2] Add Socket.IO tests for shared table state, participant-specific authorization, feedback-event isolation, reconnect ordering, and ignoring stale state versions in `backend/tests/integration/multiplayer-training.socket.test.ts`.

### Implementation for User Story 2

- [ ] T028 [US2] Add a server-normalized decision-context builder in `backend/src/modules/multiplayer/multiplayer.training.service.ts` that records only the acting player's own cards, public board, pot, stacks, position, prior public actions, and legal actions before the accepted action.
- [X] T029 [US2] Extend the accepted-action transaction in `backend/src/modules/multiplayer/multiplayer.service.ts` and `backend/src/modules/multiplayer/multiplayer.training.repository.ts` to create exactly one decision for an enrolled participant only after the Poker Engine accepts the action, linked by unique `tableActionId`.
- [X] T030 [US2] Extend `backend/src/modules/multiplayer/multiplayer.training.projection.ts` and `backend/src/modules/multiplayer/multiplayer.training.socket.ts` to emit private feedback placeholders/events only to the acting participant while leaving shared table events unchanged.
- [ ] T031 [US2] Add bounded action-context validation and transaction error handling in `backend/src/modules/multiplayer/multiplayer.training.validation.ts` and `backend/src/modules/multiplayer/multiplayer.training.errors.ts` so invalid actions never create decisions or mutate training state.
- [ ] T032 [US2] Add the multiplayer training feedback panel and server-acknowledged action integration to `frontend/src/pages/MultiplayerTrainingPage.tsx` and `frontend/src/services/multiplayerSocket.ts`, rejecting stale events and never performing optimistic poker-state transitions.
- [ ] T033 [P] [US2] Add frontend coverage for private cards, public table state, legal-action availability, stale-event handling, duplicate acknowledgements, and absence of other players' feedback in `frontend/tests/multiplayer-training-actions.test.tsx`.

**Checkpoint**: US1 and US2 work together: enrolled participants can play authoritative hands, and every accepted training action is captured once without privacy or state-consistency violations.

## Phase 5: User Story 3 - Recibir evaluación estratégica individual (Priority: P2)

**Goal**: Give each participant private, immutable feedback based on available equity and published strategy while preserving unavailable states and historical snapshots.

**Independent Test**: Complete decisions for two participants, verify each sees only their own feedback, confirm available and unavailable strategy cases, and prove later strategy publication/retirement does not rewrite existing snapshots.

### Tests for User Story 3

- [ ] T034 [P] [US3] Add contract tests for caller-scoped decision listings, evaluated/unavailable feedback, strategy metadata, explanation limitations, and bounded filters in `backend/tests/contract/multiplayer-training-feedback.contract.test.ts`.
- [ ] T035 [P] [US3] Add integration tests for exact decision context, equity/strategy separation, available feedback, `UNAVAILABLE` feedback, calculation fingerprints, and immutable strategy snapshots in `backend/tests/integration/multiplayer-training-feedback.integration.test.ts`.
- [ ] T036 [P] [US3] Add security tests proving cross-participant decision, equity, strategy-row, explanation, and evaluation-snapshot access is rejected or redacted in `backend/tests/security/multiplayer-training-feedback.security.test.ts`.
- [ ] T037 [P] [US3] Add performance coverage for bounded private decision history and feedback projection with 1,000 decisions in `backend/tests/performance/multiplayer-training-feedback.performance.test.ts`.

### Implementation for User Story 3

- [ ] T038 [US3] Implement server-side evaluation orchestration in `backend/src/modules/multiplayer/multiplayer.training.evaluation.ts`, keeping equity calculation, strategy lookup, classification, explanation, and availability as separate steps.
- [ ] T039 [US3] Persist immutable multiplayer evaluation snapshots through `backend/src/modules/multiplayer/multiplayer.training.repository.ts` and `backend/src/modules/strategy/strategy.snapshot.repository.ts`, retaining the exact strategy version/row, equity result, availability, limitations, and calculation fingerprint.
- [ ] T040 [US3] Implement caller-scoped decision history and feedback projection in `backend/src/modules/multiplayer/multiplayer.training.service.ts` and `backend/src/modules/multiplayer/multiplayer.training.projection.ts`, returning no recommendation when strategy or required data is unavailable.
- [ ] T041 [US3] Add private `training:decision-evaluated` event delivery and reconnect replay in `backend/src/modules/multiplayer/multiplayer.training.socket.ts`, with HTTP recovery as the source of truth for missed events.
- [ ] T042 [US3] Render evaluation category, equity, strategy frequencies, assumptions, and limitations in `frontend/src/pages/MultiplayerTrainingPage.tsx`, keeping quantitative equity separate from strategic recommendation and unavailable feedback explicit.
- [ ] T043 [P] [US3] Add frontend tests for evaluated feedback, mixed recommendations, unavailable strategy, private decision history, immutable displayed snapshots, and accessible limitation messaging in `frontend/tests/multiplayer-training-feedback.test.tsx`.

**Checkpoint**: US3 is independently verifiable: each participant can review their own feedback, unavailable strategy is explicit, and historical evaluation data remains immutable.

## Phase 6: User Story 4 - Recuperar y cerrar una sesión de forma segura (Priority: P2)

**Goal**: Recover authorized table and private training state after connection loss, apply deterministic timeout/abandonment rules, and publish terminal history once.

**Independent Test**: Disconnect and reconnect a participant, exercise timeout/abandonment and terminal hand paths, and confirm one immutable result and one authorized history record.

### Tests for User Story 4

- [ ] T044 [P] [US4] Add contract tests for reconnect recovery, leave/abandonment, terminal training status, and history access in `backend/tests/contract/multiplayer-training-recovery.contract.test.ts`.
- [ ] T045 [P] [US4] Add integration tests for reconnect after missed events, eliminated participant recovery denial, acting-player timeout fold, host abandonment, fold/all-in/showdown closure, and one-time terminal publication in `backend/tests/integration/multiplayer-training-recovery.integration.test.ts`.
- [ ] T046 [P] [US4] Add security tests for closed sessions, stale reconnect identifiers, unauthorized history/replay/analytics access, and private feedback after table termination in `backend/tests/security/multiplayer-training-recovery.security.test.ts`.

### Implementation for User Story 4

- [ ] T047 [US4] Implement terminal session completion and idempotent `MULTIPLAYER` Hand History publication in `backend/src/modules/multiplayer/multiplayer.training.service.ts` and `backend/src/modules/multiplayer/multiplayer.history.ts`, preserving existing access policies and excluding private feedback from public snapshots.
- [ ] T048 [US4] Extend reconnect and presence handling in `backend/src/modules/multiplayer/multiplayer.service.ts`, `backend/src/modules/multiplayer/multiplayer.training.service.ts`, and `backend/src/modules/multiplayer/multiplayer.training.socket.ts` for timeout, abandonment, elimination, closed tables, and private decision replay.
- [ ] T049 [US4] Emit private `training:completed` events and stable terminal errors from `backend/src/modules/multiplayer/multiplayer.training.socket.ts` and `backend/src/shared/errors.ts`, without changing shared table state ordering.
- [ ] T050 [US4] Add terminal, reconnect, abandonment, and history/replay/analytics recovery states to `frontend/src/pages/MultiplayerTrainingPage.tsx` and `frontend/src/services/multiplayerTrainingApi.ts`.
- [ ] T051 [P] [US4] Add frontend coverage for reconnect recovery, timeout/abandonment messaging, closed-table state, terminal feedback immutability, and one-time completion handling in `frontend/tests/multiplayer-training-recovery.test.tsx`.

**Checkpoint**: All four user stories are independently verifiable; gameplay, private feedback, recovery, terminal history, and historical integrity work together.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Complete documentation, migration validation, regression coverage, performance gates, and cleanup.

- [ ] T052 [P] Update `backend/README.md`, `README.md`, and `specs/013-multiplayer-training/quickstart.md` with enrollment rules, private feedback boundaries, timeout/abandonment policy, migration notes, and validation commands.
- [ ] T053 [P] Review `backend/src/modules/multiplayer/`, `backend/src/modules/trainer/`, and `frontend/src/` for duplicated authorization/projection/evaluation logic and remove dead Feature 013 paths without moving Poker Engine authority.
- [ ] T054 Run `backend\npm.cmd run prisma:migrate:deploy`, backend focused tests, frontend focused tests, backend/frontend builds, and lint; record unrelated baseline failures in `specs/013-multiplayer-training/quickstart.md`.
- [ ] T055 Run the complete backend and frontend regression suites and execute the manual scenarios in `specs/013-multiplayer-training/quickstart.md`; leave this task open if baseline failures or privacy scenarios remain unresolved.
- [ ] T056 Verify all Feature 013 acceptance criteria, constitution gates, task-to-story traceability, and generated artifacts in `specs/013-multiplayer-training/plan.md`, `spec.md`, `data-model.md`, `contracts/`, and `quickstart.md`.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; establishes fixtures, helpers, and source boundaries.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories; migration, privacy projection, authorization, and multiplayer invariants must be complete first.
- **User Story 1 (Phase 3)**: Depends on Foundational and delivers the MVP enrollment flow.
- **User Story 2 (Phase 4)**: Depends on US1 enrollment and the Foundational action/projection boundary; it makes accepted table actions capture training decisions.
- **User Story 3 (Phase 5)**: Depends on US2 decision capture and the existing equity/strategy modules; it adds private evaluation feedback.
- **User Story 4 (Phase 6)**: Depends on US2 terminal action flow and US3 decision/evaluation persistence; it adds recovery and terminal publication.
- **Polish (Phase 7)**: Depends on all desired user stories and their focused validation.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; independently delivers authenticated create/join/leave training enrollment.
- **US2 (P1)**: Depends on US1 because only enrolled participants generate training captures, but normal table actions remain independently testable.
- **US3 (P2)**: Depends on US2 because evaluation feedback requires accepted `TableAction`-linked decisions.
- **US4 (P2)**: Depends on US2 for terminal table transitions and on US3 for private decision replay and snapshot integrity.

### Within Each User Story

- Contract, integration, security, and performance tests are written before implementation tasks and should fail until the story is implemented.
- Persistence/types precede services; services precede routes/socket handlers; projections and frontend consume the stabilized contract.
- Each story ends with its checkpoint before the next dependent story begins.

### Parallel Opportunities

- T002, T003, T007, T008, T012, and T013 can run in parallel after the setup boundary is agreed.
- T014, T015, and T016 can run in parallel in US1; T021 and T023 can run in parallel after the API shape is fixed.
- T024, T025, T026, and T027 can run in parallel in US2; T033 can proceed after the feedback event shape is stable.
- T034, T035, T036, and T037 can run in parallel in US3; T043 can proceed after the projection contract is stable.
- T044, T045, and T046 can run in parallel in US4; T051 can proceed after terminal UI states are defined.
- T052, T053, and T056 can run in parallel after implementation; T054 and T055 remain final validation gates.

## Parallel Execution Examples

### User Story 1

```text
Task: T014 Contract tests in backend/tests/contract/multiplayer-training-enrollment.contract.test.ts
Task: T015 Integration tests in backend/tests/integration/multiplayer-training-enrollment.integration.test.ts
Task: T016 Security tests in backend/tests/security/multiplayer-training-enrollment.security.test.ts
```

### User Story 2

```text
Task: T024 HTTP/realtime contract tests in backend/tests/contract/multiplayer-training-actions.contract.test.ts
Task: T025 Action integration tests in backend/tests/integration/multiplayer-training-actions.integration.test.ts
Task: T026 Privacy/security tests in backend/tests/security/multiplayer-training-actions.security.test.ts
Task: T027 Socket ordering tests in backend/tests/integration/multiplayer-training.socket.test.ts
```

### User Story 3

```text
Task: T034 Feedback contract tests in backend/tests/contract/multiplayer-training-feedback.contract.test.ts
Task: T035 Evaluation integration tests in backend/tests/integration/multiplayer-training-feedback.integration.test.ts
Task: T036 Cross-participant security tests in backend/tests/security/multiplayer-training-feedback.security.test.ts
Task: T037 Private history performance tests in backend/tests/performance/multiplayer-training-feedback.performance.test.ts
```

### User Story 4

```text
Task: T044 Recovery contract tests in backend/tests/contract/multiplayer-training-recovery.contract.test.ts
Task: T045 Recovery integration tests in backend/tests/integration/multiplayer-training-recovery.integration.test.ts
Task: T046 Terminal privacy/security tests in backend/tests/security/multiplayer-training-recovery.security.test.ts
```

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 Setup and Phase 2 Foundational.
2. Complete Phase 3 User Story 1.
3. Stop and validate that authorized room members can create/join/leave the training overlay without exposing private data or changing table membership.
4. Only then add action capture, evaluation, and recovery.

### Incremental Delivery

1. Foundation ready: schema, migration, authorization, projections, and multiplayer invariants.
2. Add US1: enrollment and private participant boundary; validate independently.
3. Add US2: authoritative action capture and idempotent decision creation; validate concurrency and privacy.
4. Add US3: private equity/strategy feedback and immutable snapshots; validate unavailable behavior.
5. Add US4: reconnection, timeout/abandonment, terminal publication, and recovery.
6. Complete polish, full regression, builds, lint, migrations, and quickstart validation.

### Parallel Team Strategy

1. One developer completes schema/invariants and fixtures in Phase 2.
2. After the foundational checkpoint:
   - Developer A: US1 enrollment routes, repository, and tests.
   - Developer B: US2 action capture and socket/privacy tests after the enrollment contract is stable.
   - Developer C: US3 evaluation adapter and private feedback tests after decision shape is stable.
3. US4 recovery and terminal publication begins after the action/evaluation boundaries are integrated.

## Notes

- `[P]` tasks touch different files or independent test surfaces and have no incomplete dependency on another parallel task.
- `[US1]` through `[US4]` map directly to the prioritized stories in `spec.md`.
- Every task includes at least one concrete repository path.
- The Poker Engine remains unchanged as the rules authority unless a focused invariant fix is required in the existing multiplayer integration.
- Do not mark T055 complete while unrelated baseline failures or unexecuted manual privacy scenarios remain undocumented.
