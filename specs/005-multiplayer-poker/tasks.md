---

description: "Implementation task list for multiplayer poker tables"
---

# Tasks: Multiplayer Poker Tables

**Input**: Design documents from `/specs/005-multiplayer-poker/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included because the constitution requires automated tests for critical poker, authorization, concurrency, reconnection, and edge-case logic.

**Organization**: Tasks are grouped by user story so each increment can be implemented and validated independently after the shared foundation is complete.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the dependencies and source/test scaffolding required by the multiplayer module.

- [X] T001 Add `socket.io` to `backend/package.json` and `socket.io-client` to the appropriate backend/frontend package manifests, preserving the existing Node.js 20 and TypeScript toolchain.
- [X] T002 [P] Create the multiplayer module directories and placeholder entry files under `backend/src/modules/multiplayer/` (`multiplayer.types.ts`, `multiplayer.validation.ts`, `multiplayer.repository.ts`, `multiplayer.service.ts`, `multiplayer.routes.ts`, `multiplayer.socket.ts`, `multiplayer.presence.ts`, and `multiplayer.projection.ts`).
- [ ] T003 [P] Create the feature test scaffolding under `backend/tests/contract/`, `backend/tests/integration/`, `backend/tests/unit/`, and `frontend/tests/` for multiplayer table coverage.
- [ ] T004 [P] Add typed frontend service scaffolding in `frontend/src/services/multiplayerApi.ts` and `frontend/src/services/multiplayerSocket.ts` without duplicating the backend game rules.
- [ ] T005 Update `backend/README.md` and the root `README.md` with the multiplayer prerequisite, local startup, and validation command references from `specs/005-multiplayer-poker/quickstart.md`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement the shared persistence, authorization, projection, error, and server lifecycle foundations required by every user story.

**Critical**: No user story implementation should begin until this phase is complete.

- [X] T006 Add `MultiplayerTable`, `TableParticipant`, `MultiplayerHand`, and `TableAction` models plus required enums, relations, indexes, and uniqueness constraints to `backend/src/db/prisma/schema.prisma`; preserve the data-model constraints that `(tableId, userId)`, `(tableId, roomMemberId)`, `(tableId, seatNumber)`, `(tableId, handNumber)`, and `(handId, userId, requestId)` are unique.
- [X] T007 Create the versioned PostgreSQL migration at `backend/src/db/prisma/migrations/20260926000200_add_multiplayer_tables/migration.sql`, including foreign keys, non-negative stack checks, state/status columns, indexes for active tables/hands and presence, and rollback-safe ordering.
- [X] T008 Generate and validate the Prisma client from `backend/src/db/prisma/schema.prisma`, then verify the new migration applies without resetting the existing database through `backend/package.json` scripts.
- [X] T009 [P] Add stable multiplayer error codes and HTTP/socket error mappings in `backend/src/shared/errors.ts` for `ROOM_ACCESS_DENIED`, `TABLE_NOT_FOUND`, `TABLE_CLOSED`, `HAND_NOT_FOUND`, `STALE_GAME_STATE`, `NOT_YOUR_TURN`, `ILLEGAL_ACTION`, `DUPLICATE_ACTION`, and disconnected-seat conflicts.
- [X] T010 [P] Define shared backend request, snapshot, event, and state-version types in `backend/src/modules/multiplayer/multiplayer.types.ts`, matching `specs/005-multiplayer-poker/contracts/table-http.md` and `specs/005-multiplayer-poker/contracts/realtime-events.md`.
- [X] T011 [P] Implement Zod validation for table room IDs, reconnect payloads, action `handId`, `expectedVersion`, `requestId`, action type, and conditional amount fields in `backend/src/modules/multiplayer/multiplayer.validation.ts`.
- [X] T012 Implement `backend/src/modules/multiplayer/multiplayer.repository.ts` methods for creating one table from a started room, copying the fixed roster, loading current state, loading authorized participants, and enforcing the unique table/seat constraints in transactions.
- [X] T013 Implement per-user state projection in `backend/src/modules/multiplayer/multiplayer.projection.ts`, redacting raw deck state and other participants' unrevealed hole cards while exposing the authenticated participant's private cards, legal actions, presence, public state, and completed results.
- [X] T014 Refactor `backend/src/server.ts` to create one HTTP server, attach Socket.IO, and expose the server lifecycle needed by production startup and integration tests while keeping `backend/src/app.ts` usable for HTTP-only tests.
- [X] T015 Add Socket.IO session authentication middleware in `backend/src/modules/multiplayer/multiplayer.socket.ts` that reads the existing session cookie/store, attaches the authenticated user ID, rejects unauthenticated connections, and never trusts a client-supplied user ID.
- [X] T016 Register the multiplayer HTTP router and shared error handling in `backend/src/app.ts`, and register Socket.IO table event handlers from `backend/src/server.ts` through the multiplayer module boundary.
- [X] T017 Add foundational test helpers for database cleanup, authenticated sessions, started-room fixtures, deterministic engine seeds, and Socket.IO client connections in `backend/tests/helpers/testApp.ts` and `backend/tests/helpers/multiplayer.ts`.

**Checkpoint**: The database can represent one table and fixed roster, HTTP/socket identities are authenticated, projections redact private data, and the app/server test harness can create an authorized started table.

---

## Phase 3: User Story 1 - Join a Live Table and See Its State (Priority: P1) 🎯 MVP

**Goal**: A member of a started room can enter the table, receive the current authorized hand projection, and see a shared public state without private-card leakage.

**Independent Test**: Create and start a room with two authenticated users, open the table from both accounts, and verify equal public state, distinct private-card projections, fixed seats, and rejection for a non-member.

### Tests for User Story 1

- [X] T018 [P] [US1] Add HTTP contract tests for `GET /api/rooms/:roomId/table` and `POST /api/rooms/:roomId/table/reconnect` in `backend/tests/contract/multiplayer-table.test.ts`, covering `200`, authentication, membership, missing-table, and closed-table responses.
- [X] T019 [P] [US1] Add projection unit tests in `backend/tests/unit/multiplayer-projection.test.ts` proving each participant sees only their own hole cards before showdown and that raw deck/persistence fields never appear.
- [X] T020 [P] [US1] Add Socket.IO join/snapshot integration tests in `backend/tests/integration/multiplayer-socket.test.ts`, covering authenticated `table:join`, room authorization, idempotent join, and per-user snapshots.

### Implementation for User Story 1

- [X] T021 [US1] Implement table bootstrap in `backend/src/modules/multiplayer/multiplayer.service.ts`: for a `STARTED` room, create exactly one `MultiplayerTable`, copy the final room roster into `TableParticipant` with unique seats, and start the first Poker Engine hand atomically.
- [X] T022 [US1] Implement authorized table and reconnect reads in `backend/src/modules/multiplayer/multiplayer.service.ts`, returning a complete per-user projection with `stateVersion`, hand stage, board, pots, current turn, legal actions, stacks, seats, and presence.
- [X] T023 [US1] Implement `GET /api/rooms/:roomId/table` and `POST /api/rooms/:roomId/table/reconnect` in `backend/src/modules/multiplayer/multiplayer.routes.ts` with existing session authentication and stable error handling.
- [X] T024 [US1] Implement Socket.IO `table:join` and `table:leave` handlers in `backend/src/modules/multiplayer/multiplayer.socket.ts`, joining only authorized room channels and emitting `table:snapshot` using the authenticated user's projection.
- [X] T025 [US1] Add the typed HTTP and socket clients in `frontend/src/services/multiplayerApi.ts` and `frontend/src/services/multiplayerSocket.ts`, including snapshot/version types and reconnect handling.
- [X] T026 [US1] Create `frontend/src/pages/MultiplayerTablePage.tsx` to render seats, stacks, board, pot, street, current turn, legal actions, connection state, private cards, and loading/error/closed states from authorized snapshots.
- [X] T027 [US1] Register the started-room table route in `frontend/src/App.tsx` and add navigation from `frontend/src/pages/RoomsPage.tsx` without exposing a table to non-members.

**Checkpoint**: US1 is independently testable: authorized members can enter one live table and receive consistent public state with correctly redacted private cards.

---

## Phase 4: User Story 2 - Act in Turn at a Shared Table (Priority: P1)

**Goal**: A participant can submit legal actions, all members see the committed state, and concurrent/stale/unauthorized actions cannot mutate the hand incorrectly.

**Independent Test**: Use two authenticated clients to submit legal, out-of-turn, stale, duplicate, malformed, and concurrent actions; verify exactly one valid transition and equal state versions for all clients.

### Tests for User Story 2

- [ ] T028 [P] [US2] Add action contract tests for `POST /api/rooms/:roomId/table/actions` in `backend/tests/contract/multiplayer-actions.test.ts`, covering legal actions, validation, turn ownership, stale versions, duplicate request IDs, and stable error bodies.
- [ ] T029 [P] [US2] Add concurrency integration tests in `backend/tests/integration/multiplayer-concurrency.test.ts` that submit two actions for one turn concurrently and prove no more than one action, card, pot, or state transition is committed.
- [ ] T030 [P] [US2] Add Poker Engine adapter tests in `backend/tests/unit/multiplayer-service.test.ts` proving fold/check/call/bet/raise/all-in, street advancement, side pots, and showdown transitions use the existing engine unchanged.

### Implementation for User Story 2

- [X] T031 [US2] Implement transactional action processing in `backend/src/modules/multiplayer/multiplayer.service.ts`: lock the current table/hand row, verify `handId` and `expectedVersion`, resolve the authenticated seat, call the Poker Engine, persist the next snapshot/action/version atomically, and return the authorized projection.
- [X] T032 [US2] Implement idempotent accepted/rejected action persistence in `backend/src/modules/multiplayer/multiplayer.repository.ts`, enforcing the data-model rule that `(handId, userId, requestId)` is unique and duplicate accepted requests return the original resulting state.
- [X] T033 [US2] Implement `POST /api/rooms/:roomId/table/actions` in `backend/src/modules/multiplayer/multiplayer.routes.ts`, applying Zod validation and mapping stale, out-of-turn, illegal, duplicate, and closed-table failures to the documented errors.
- [X] T034 [US2] Implement Socket.IO `table:action` handling in `backend/src/modules/multiplayer/multiplayer.socket.ts` by routing through the same service as HTTP and emitting `table:state-changed` only after the persistence transaction commits.
- [X] T035 [US2] Add frontend action controls and optimistic-free server acknowledgment handling in `frontend/src/pages/MultiplayerTablePage.tsx`, disabling unavailable actions based on server-provided legal actions and replacing local state only with newer snapshots.
- [X] T036 [US2] Add client-side stale-version/error recovery in `frontend/src/services/multiplayerSocket.ts` and `frontend/src/services/multiplayerApi.ts` so a rejected action requests the newest authorized snapshot instead of mutating local game state.

**Checkpoint**: US2 is independently testable: accepted actions advance one authoritative state, all members converge, and invalid/concurrent requests do not alter the game.

---

## Phase 5: User Story 3 - Stay Connected and Recover a Table Session (Priority: P2)

**Goal**: Temporary disconnection preserves a seat, reconnect returns current authorized state, presence is visible, and an acting player is automatically folded after 60 seconds offline.

**Independent Test**: Disconnect and reconnect a member within 60 seconds, then disconnect the acting member beyond 60 seconds and verify recovery, presence events, exactly-once auto-fold, and continued play.

### Tests for User Story 3

- [ ] T037 [P] [US3] Add reconnect integration tests in `backend/tests/integration/multiplayer-reconnect.test.ts` covering refresh/reconnect, missed broadcasts, same-account multiple tabs, duplicate-seat prevention, version convergence, and private-card redaction.
- [X] T038 [P] [US3] Add presence/timeout unit tests in `backend/tests/unit/multiplayer-presence.test.ts` covering online/disconnected transitions, server timestamps, 60-second grace, acting-seat auto-fold, and no repeated fold.
- [ ] T039 [P] [US3] Add frontend reconnect tests in `frontend/tests/multiplayer-table.test.tsx` covering loading, connection-loss, snapshot recovery, stale-event discard, and closed-table states.

### Implementation for User Story 3

- [X] T040 [US3] Implement presence persistence and heartbeat methods in `backend/src/modules/multiplayer/multiplayer.repository.ts` for `lastSeenAt`, `disconnectedAt`, and participant connection status without trusting client timestamps.
- [X] T041 [US3] Implement Socket.IO `table:heartbeat`, connection, and disconnect handlers in `backend/src/modules/multiplayer/multiplayer.socket.ts`, broadcasting `table:presence-changed` to authorized members and preserving the participant seat.
- [X] T042 [US3] Implement the server-owned timeout scheduler/reaper in `backend/src/modules/multiplayer/multiplayer.socket.ts`, finding acting participants disconnected beyond 60 seconds and submitting one automatic fold through the normal transactional service path.
- [ ] T043 [US3] Add reconnect snapshot recovery and same-account connection coordination in `backend/src/modules/multiplayer/multiplayer.service.ts`, ensuring one persisted participant seat and newest-version response regardless of connection count.
- [X] T044 [US3] Add frontend heartbeat, reconnect, state-version filtering, and presence rendering in `frontend/src/services/multiplayerSocket.ts` and `frontend/src/pages/MultiplayerTablePage.tsx`.

**Checkpoint**: US3 is independently testable: reconnect is idempotent, authorized state is recoverable within the grace period, presence is visible, and timeout folding advances the table exactly once.

---

## Phase 6: User Story 4 - Complete a Hand and Continue the Table (Priority: P2)

**Goal**: A table resolves folds/showdowns correctly, displays immutable results, rotates eligible seats for the next hand, eliminates zero-stack players, and closes below two eligible players.

**Independent Test**: Complete hands through fold, showdown, tie, and side-pot paths; verify result projections, stack updates, dealer/blind rotation, elimination, next-hand creation, and terminal table closure.

### Tests for User Story 4

- [ ] T045 [P] [US4] Add hand-result contract tests in `backend/tests/contract/multiplayer-results.test.ts` for fold wins, showdown reveals, ties, side-pot awards, updated stacks, completed-result visibility, and immutable terminal results.
- [ ] T046 [P] [US4] Add next-hand/elimination integration tests in `backend/tests/integration/multiplayer-lifecycle.test.ts` for dealer/blind rotation, zero-stack elimination, fixed started roster, automatic next-hand creation, fewer-than-two closure, and rejection after closure.
- [ ] T047 [P] [US4] Add frontend result/closure tests in `frontend/tests/multiplayer-table.test.tsx` for showdown display, pot awards, eliminated players, next-hand readiness, and terminal table state.

### Implementation for User Story 4

- [ ] T048 [US4] Implement atomic hand completion in `backend/src/modules/multiplayer/multiplayer.service.ts`, persisting the engine result, updating participant stacks, marking zero-stack participants `ELIMINATED`, and preserving the immutable completed result.
- [ ] T049 [US4] Implement next-hand sequencing in `backend/src/modules/multiplayer/multiplayer.service.ts`, selecting at least two eligible participants, rotating dealer/blinds among eligible seats, incrementing hand number/version, and creating the next engine hand in the same transaction.
- [ ] T050 [US4] Implement terminal table closure in `backend/src/modules/multiplayer/multiplayer.service.ts` and `backend/src/modules/multiplayer/multiplayer.repository.ts` when fewer than two eligible players remain, preserving completed results and rejecting later actions.
- [ ] T051 [US4] Implement result projection and lifecycle event causes in `backend/src/modules/multiplayer/multiplayer.projection.ts` and `backend/src/modules/multiplayer/multiplayer.socket.ts` for `HAND_COMPLETED`, `PLAYER_ELIMINATED`, and `TABLE_CLOSED`.
- [ ] T052 [US4] Render completed hand results, updated stacks, eliminated participants, next-hand transitions, and closed-table messaging in `frontend/src/pages/MultiplayerTablePage.tsx`.

**Checkpoint**: US4 is independently testable: a complete hand produces the Poker Engine result for every member, eligible players continue correctly, and the table closes cleanly below two eligible players.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Harden the complete feature, document operations, and validate the end-to-end quickstart.

- [ ] T053 [P] Add authorization/security regression coverage in `backend/tests/contract/multiplayer-security.test.ts` for crafted private-card reads, forged user/seat IDs, non-member socket joins, room mismatches, and malformed payloads.
- [ ] T054 [P] Add state-projection and event-version regression coverage in `backend/tests/integration/multiplayer-consistency.test.ts` for delayed/duplicated broadcasts, missed delivery, post-commit recovery, and no state rollback.
- [ ] T055 [P] Add frontend accessibility and error-state coverage in `frontend/tests/multiplayer-table.test.tsx` for keyboard action controls, readable turn/status messaging, loading states, connection loss, authorization errors, and table closure.
- [X] T056 Update `backend/README.md` and `README.md` with the final table lifecycle, event/reconnect behavior, timeout policy, private-card boundary, and no-tournament/no-real-money scope.
- [ ] T057 Add operational logging/metrics around action latency, stale conflicts, socket connections, reconnects, timeout folds, table closure, and projection failures in `backend/src/modules/multiplayer/` without logging private cards or credentials.
- [ ] T058 Run the full backend and frontend test suites, builds, lint checks, migration deployment, and every scenario in `specs/005-multiplayer-poker/quickstart.md`; record any environment prerequisites or residual gaps in the feature documentation.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** has no feature dependencies and can start immediately.
- **Phase 2: Foundational** depends on Phase 1 and blocks all user-story phases.
- **Phase 3: US1** depends on Phase 2 and is the MVP increment.
- **Phase 4: US2** depends on the US1 table bootstrap/projection foundation and adds action mutation; its tests should remain independently runnable with the shared foundation.
- **Phase 5: US3** depends on US1 snapshot/projection and US2 transactional action processing because timeout folding uses the same action path.
- **Phase 6: US4** depends on US2 engine transitions and US3 persistence/recovery because completion and automatic fold must share one lifecycle path.
- **Phase 7: Polish** depends on all desired user stories.

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational; MVP.
- **US2 (P1)**: Depends on Foundational and the US1 table/projection bootstrap; action service can be developed in parallel with US1 UI after shared repository/types exist.
- **US3 (P2)**: Depends on the US1 snapshot flow and US2 transactional action service.
- **US4 (P2)**: Depends on the US2 engine-action path and US3 timeout/presence path; it owns completion/next-hand behavior.

### Parallel Opportunities

- T002-T004 can run in parallel after the dependency installation decision in T001.
- T009-T011 can run in parallel with T006-T008.
- T018-T020 can run in parallel before US1 implementation tasks.
- T028-T030 can run in parallel before US2 implementation tasks.
- T037-T039 can run in parallel before US3 implementation tasks.
- T045-T047 can run in parallel before US4 implementation tasks.
- T053-T055 can run in parallel during final hardening.
- Different story teams can work in parallel after their declared dependencies, but shared service files (`multiplayer.service.ts`, `multiplayer.socket.ts`) should be coordinated to avoid conflicting edits.

## Parallel Example: User Story 1

```text
Task T018: Contract tests in backend/tests/contract/multiplayer-table.test.ts
Task T019: Projection tests in backend/tests/unit/multiplayer-projection.test.ts
Task T020: Socket join tests in backend/tests/integration/multiplayer-socket.test.ts
```

## Parallel Example: User Story 2

```text
Task T028: Action contract tests in backend/tests/contract/multiplayer-actions.test.ts
Task T029: Concurrency tests in backend/tests/integration/multiplayer-concurrency.test.ts
Task T030: Engine adapter tests in backend/tests/unit/multiplayer-service.test.ts
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundational persistence, authorization, projection, and server lifecycle.
3. Complete Phase 3 US1 table entry, snapshot recovery, private-card projection, and minimal table UI.
4. Run the US1 contract, projection, socket, build, and quickstart checks.
5. Stop for review/demo before enabling action mutation.

### Incremental Delivery

1. Setup + Foundational: recoverable authorized table foundation.
2. US1: members can enter and inspect a synchronized table state.
3. US2: members can play legal actions with concurrency protection.
4. US3: members can reconnect and survive temporary disconnection.
5. US4: hands resolve, rotate, eliminate, and close correctly.
6. Polish: security, observability, accessibility, documentation, and full validation.

### Parallel Team Strategy

1. Complete Setup and Foundational together.
2. After Foundation:
   - Developer A: US1 bootstrap/projection and table UI.
   - Developer B: US2 action transaction and concurrency tests.
   - Developer C: US3 socket presence/reconnect infrastructure.
3. After US2/US3 contracts stabilize, complete US4 lifecycle and final cross-cutting validation.

## Notes

- Every task uses the required `- [ ] T### [P?] [US#?] description with file path` format.
- The existing Poker Engine remains the rules authority; multiplayer code must not duplicate betting or hand-evaluation logic.
- Broadcast only after persistence commit; reconnect must always be able to recover from a complete authorized snapshot.
- Do not add tournament, multi-table, real-money, or long-term hand-history work to this feature.
