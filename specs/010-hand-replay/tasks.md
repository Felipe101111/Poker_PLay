# Tasks: Replay de manos

**Input**: Design documents from `/specs/010-hand-replay/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/hand-replay-http.md](contracts/hand-replay-http.md), [quickstart.md](quickstart.md)

**Tests**: Included because the specification defines independent tests, the quickstart requires focused suites, and privacy/replay ordering are critical behavior.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared fixtures and type boundaries without changing poker rules or persistence.

- [X] T001 [P] Add representative terminal, unauthorized, anonymized, and incomplete hand fixtures in `backend/tests/helpers/hand-replay.ts`
- [X] T002 [P] Add authorized replay response fixtures covering initial state, ordered events, terminal state, and limitations in `frontend/tests/fixtures/hand-replay.ts`
- [X] T003 [P] Define shared replay enums and response types matching `contracts/hand-replay-http.md` in `backend/src/modules/hand-history/hand-history.replay.ts`
- [X] T004 [P] Add typed replay document, event, limitation, and navigation response types to `frontend/src/services/handHistoryApi.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the server projection and authorization boundary required by every user story.

**CRITICAL**: No user story implementation can begin until this phase is complete.

- [X] T005 [P] Add replay-specific error codes for terminal, unavailable, and authorization-safe failures in `backend/src/shared/errors.ts`
- [X] T006 [P] Implement an authorized ordered history lookup that loads `HandHistory`, `HandAction`, and `HistoryAccessPolicy` without mutating records in `backend/src/modules/hand-history/hand-history.repository.ts`
- [X] T007 [P] Implement shared projection helpers for initial state, event state, terminal state, participants, and safe limitations in `backend/src/modules/hand-history/hand-history.replay.ts`
- [X] T008 Implement `getReplay(userId, historyId)` using only terminal records and `canViewDetail = true`, returning the same not-found behavior for unauthorized and nonexistent IDs in `backend/src/modules/hand-history/hand-history.service.ts` (depends on T005-T007)
- [X] T009 Implement `GET /api/hand-history/:historyId/replay` with `requireAuth`, standard error handling, and the response envelope from `specs/010-hand-replay/contracts/hand-replay-http.md` in `backend/src/modules/hand-history/hand-history.routes.ts` (depends on T008)
- [X] T010 [P] Add frontend API request method for `GET /api/hand-history/:historyId/replay` with encoded IDs and typed errors in `frontend/src/services/handHistoryApi.ts`

**Checkpoint**: The server can return one authorized, privacy-safe replay document without adding persistence or changing a hand.

---

## Phase 3: User Story 1 - Reproducir una mano terminada (Priority: P1) 🎯 MVP

**Goal**: An authorized user can open a terminal hand and inspect its initial state, ordered events, and terminal state.

**Independent Test**: Authenticate as an authorized participant, request a terminal hand replay, and verify the initial state, every visible event in `sequence` order, the terminal state, and no mutation or duplicate record.

### Tests for User Story 1

- [X] T011 [P] [US1] Add contract coverage for successful replay, unauthenticated access, active hand rejection, and safe not-found behavior in `backend/tests/contract/hand-replay.test.ts`
- [X] T012 [P] [US1] Add unit coverage for `sequence` ordering, initial state, terminal state, and immutable source records in `backend/tests/unit/hand-history/hand-history.replay.test.ts`
- [X] T013 [P] [US1] Add integration coverage for opening a terminal local, multiplayer, and trainer history record in `backend/tests/integration/hand-replay.test.ts`

### Implementation for User Story 1

- [X] T014 [US1] Complete replay document construction from the existing `HandHistory` and `HandAction` relations in `backend/src/modules/hand-history/hand-history.replay.ts` (depends on T007-T010)
- [X] T015 [US1] Render the replay loading, error, initial, timeline, and terminal states in `frontend/src/pages/HandReplayPage.tsx`
- [X] T016 [US1] Add the `/hand-history/:historyId/replay` route and a replay link from the history detail page in `frontend/src/App.tsx` and `frontend/src/pages/HandHistoryDetailPage.tsx`
- [X] T017 [US1] Add the authorized replay page integration test for initial state, ordered events, terminal state, and safe error display in `frontend/tests/hand-replay.test.tsx`

**Checkpoint**: User Story 1 is independently functional and is the suggested MVP.

---

## Phase 4: User Story 2 - Controlar la navegación temporal (Priority: P1)

**Goal**: A user can pause, resume, move one position at a time, and jump to a visible event without changing the historical record.

**Independent Test**: Open a replay, exercise pause, resume, next, previous, boundary clamping, and event selection, then verify every displayed state matches its selected position.

### Tests for User Story 2

- [X] T018 [P] [US2] Add reducer tests for initial position, next/previous clamping, event selection, pause, and terminal playback in `frontend/tests/hand-replay-navigation.test.tsx`
- [X] T019 [P] [US2] Add integration coverage proving navigation performs no mutation request and preserves the source history in `backend/tests/integration/hand-replay-readonly.test.ts`

### Implementation for User Story 2

- [X] T020 [P] [US2] Implement pure replay navigation state transitions for `position`, `isPlaying`, and playback completion in `frontend/src/pages/handReplayState.ts`
- [X] T021 [US2] Connect the replay page to next, previous, play, pause, and event selection controls with boundary-safe position updates in `frontend/src/pages/HandReplayPage.tsx` (depends on T020)
- [X] T022 [US2] Add stable accessible labels and progress information for current position, total positions, pending events, and terminal state in `frontend/src/pages/HandReplayPage.tsx`
- [X] T023 [US2] Add the playback interval cleanup and reopen behavior so unmounting or changing history IDs cannot advance stale replay state in `frontend/src/pages/HandReplayPage.tsx`

**Checkpoint**: User Stories 1 and 2 are independently testable; navigation remains local and read-only.

---

## Phase 5: User Story 3 - Ver información según autorización (Priority: P1)

**Goal**: Every replay position applies the requesting user's privacy policy and never exposes unauthorized cards, identities, deck data, or existence.

**Independent Test**: Open the same history as an authorized participant, anonymized participant, and unauthorized user; compare each response and rendered position against the applicable visibility policy.

### Tests for User Story 3

- [X] T024 [P] [US3] Add contract tests proving unauthorized replay IDs return the safe not-found response and payloads omit deck and hidden cards in `backend/tests/contract/hand-replay-security.test.ts`
- [X] T025 [P] [US3] Add integration tests for `FULL_AUTHORIZED`, `PUBLIC_ONLY`, and `ANONYMIZED` replay projections in `backend/tests/integration/hand-replay-privacy.test.ts`
- [X] T026 [P] [US3] Add frontend tests proving hidden fields are not rendered for public-only and anonymized replay documents in `frontend/tests/hand-replay-privacy.test.tsx`

### Implementation for User Story 3

- [X] T027 [US3] Apply `HistoryAccessPolicy.redactionProfile` to `initialState`, every `stateAfter`, `terminalState`, participant names, and limitation messages in `backend/src/modules/hand-history/hand-history.replay.ts` (depends on T024-T026)
- [X] T028 [US3] Enforce authorization-safe replay lookup and prevent ID enumeration through identical unauthorized/nonexistent handling in `backend/src/modules/hand-history/hand-history.service.ts`
- [X] T029 [US3] Render anonymized participant labels, authorized revealed cards, and privacy limitations without client-side reconstruction in `frontend/src/pages/HandReplayPage.tsx`
- [X] T030 [US3] Add replay navigation regression coverage confirming privacy remains applied after next, previous, jump, pause, and reopen in `frontend/tests/hand-replay-privacy.test.tsx`

**Checkpoint**: User Stories 1-3 preserve server authority and privacy at every replay position.

---

## Phase 6: User Story 4 - Gestionar datos históricos incompletos (Priority: P2)

**Goal**: A legacy or partially available hand remains honest and useful by showing available events plus explicit limitations instead of invented states.

**Independent Test**: Open a replay with a legacy gap, anonymized field, or no visible events and verify the limitation, available sequence, and absence of interpolated values.

### Tests for User Story 4

- [X] T031 [P] [US4] Add unit coverage for `LEGACY_GAP`, `ANONYMIZED_DATA`, `UNAVAILABLE_STATE`, and `NO_VISIBLE_EVENTS` projections in `backend/tests/unit/hand-history/hand-replay-limitations.test.ts`
- [X] T032 [P] [US4] Add integration coverage for partial replay responses and unavailable replay errors in `backend/tests/integration/hand-replay-limitations.test.ts`
- [X] T033 [P] [US4] Add frontend coverage for limitation banners, null state-after events, empty visible timelines, and terminal partial replay in `frontend/tests/hand-replay-limitations.test.tsx`

### Implementation for User Story 4

- [X] T034 [US4] Detect non-contiguous or unavailable historical sequences and attach safe `ReplayLimitation` records without interpolating state in `backend/src/modules/hand-history/hand-history.replay.ts` (depends on T031-T033)
- [X] T035 [US4] Map records with no valid replay projection to `HAND_HISTORY_REPLAY_UNAVAILABLE` while preserving the standard error envelope in `backend/src/modules/hand-history/hand-history.service.ts`
- [X] T036 [US4] Render limitation messages, event-level unavailable states, and empty visible-event guidance in `frontend/src/pages/HandReplayPage.tsx`
- [X] T037 [US4] Preserve limitations and available events when reopening or selecting positions across a historical gap in `frontend/src/pages/handReplayState.ts`

**Checkpoint**: All four user stories are independently testable, including legacy and privacy-restricted records.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Harden the feature, document it, and validate the full repository behavior.

- [X] T038 [P] Add replay endpoint, privacy, navigation, and legacy limitation documentation to `backend/README.md` and `README.md`
- [X] T039 [P] Add representative replay payload and privacy assertions for the first-page/first-state performance target in `backend/tests/performance/hand-replay-performance.test.ts`
- [X] T040 [P] Add keyboard-accessible control and responsive layout coverage for the replay page in `frontend/tests/hand-replay-accessibility.test.tsx`
- [X] T041 Run the Feature 010 quickstart scenarios and record any command or fixture corrections in `specs/010-hand-replay/quickstart.md`
- [X] T042 Run backend focused tests, backend build, frontend focused tests, and frontend build; resolve only Feature 010 failures in `backend/tests/` and `frontend/tests/`
- [X] T043 Run the full backend and frontend regression suites and verify no existing authentication, rooms, multiplayer, trainer, equity, strategy, or hand-history behavior regresses in `backend/tests/` and `frontend/tests/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies; tasks T001-T004 can run in parallel.
- **Phase 2 (Foundational)**: Depends on Phase 1; T005-T007 can run in parallel, then T008, T009, and T010 complete the shared read boundary.
- **Phase 3 (US1)**: Depends on Phase 2; provides the MVP replay document and page.
- **Phase 4 (US2)**: Depends on US1 for the loaded replay page; T018-T020 can begin once the shared response shape exists.
- **Phase 5 (US3)**: Depends on Phase 2 and can begin alongside US1/US2 where files do not conflict; privacy validation must finish before release.
- **Phase 6 (US4)**: Depends on the shared projection from Phase 2 and can begin alongside US3; it extends the same projection boundary.
- **Phase 7 (Polish)**: Depends on all desired user stories; T038-T040 can run in parallel before T041-T043.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational phase only; no dependency on other user stories.
- **User Story 2 (P1)**: Depends on the US1 replay document/page, but navigation remains independently testable and read-only.
- **User Story 3 (P1)**: Depends on the Foundational projection boundary; can be implemented in parallel with US1 except for shared replay projection edits.
- **User Story 4 (P2)**: Depends on the Foundational projection boundary; can be implemented in parallel with US3 except for shared limitation projection edits.

### Within Each User Story

- Tests should be written before implementation and initially fail.
- Projection/state model work precedes service or UI integration.
- Backend authorization/projection precedes frontend rendering of the corresponding data.
- Each checkpoint must pass its independent test before moving to the next priority.

### Parallel Opportunities

- T001-T004 are independent setup tasks.
- T005-T007 are independent foundational tasks.
- T011-T013 are independent US1 tests; T015 and T016 can proceed in parallel after the shared API boundary.
- T018-T020 are independent US2 tests/state work once US1 response types exist.
- T024-T026 are independent US3 tests; T027 and T029 require coordination because both define privacy-visible fields.
- T031-T033 are independent US4 tests; T034 and T036 require coordination because both define limitation presentation.
- T038-T040 are independent polish tasks.

---

## Parallel Example: User Story 1

```text
Task: "T011 Contract coverage in backend/tests/contract/hand-replay.test.ts"
Task: "T012 Unit coverage in backend/tests/unit/hand-history/hand-history.replay.test.ts"
Task: "T013 Integration coverage in backend/tests/integration/hand-replay.test.ts"

After the tests and shared boundary are ready:
Task: "T015 Render the replay page in frontend/src/pages/HandReplayPage.tsx"
Task: "T016 Add the replay route and history-detail link in frontend/src/App.tsx and frontend/src/pages/HandHistoryDetailPage.tsx"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundational authorization and projection.
3. Complete Phase 3 User Story 1.
4. Stop and validate the authorized terminal replay independently.
5. Demo the read-only timeline before adding playback controls or legacy handling.

### Incremental Delivery

1. Setup + Foundational -> authorized replay document.
2. User Story 1 -> open and inspect a terminal hand (MVP).
3. User Story 2 -> pause, play, step, and jump locally.
4. User Story 3 -> verify privacy policies at every position.
5. User Story 4 -> support limitations and partial legacy records.
6. Polish -> documentation, performance, accessibility, and regression validation.

### Parallel Team Strategy

1. Complete Phase 1 and Phase 2 together.
2. After the shared read boundary:
   - Developer A: User Story 1 page and endpoint tests.
   - Developer B: User Story 2 navigation state and controls.
   - Developer C: User Story 3 privacy projections and security tests.
3. Add User Story 4 limitation handling after the projection contract stabilizes.

## Notes

- Every task uses the required `- [ ] T### [P?] [US#?] description` checklist format.
- `[P]` appears only for work that can use different files without waiting on incomplete work.
- Story labels are present on every user-story task and absent from setup, foundational, and polish tasks.
- No database migration is planned because replay reads the immutable Feature 009 history model.
- No task changes poker rules or re-simulates a hand; the backend remains authoritative.
