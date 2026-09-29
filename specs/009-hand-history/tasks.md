---

description: "Implementation task list for Historial general de manos"
---

# Tasks: Historial general de manos

**Input**: Design documents from `/specs/009-hand-history/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/hand-history-http.md](contracts/hand-history-http.md), [quickstart.md](quickstart.md)

**Tests**: Tests are required by the feature specification, quickstart, and constitution. Write focused tests before implementation in each story.

**Organization**: Tasks are grouped by user story so each increment can be implemented and validated independently after the foundational phase.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the module boundary, shared vocabulary, fixtures, and test scaffolding.

- [X] T001 Create the hand-history module directories and test scaffolding in `backend/src/modules/hand-history/`, `backend/tests/unit/hand-history/`, `backend/tests/contract/hand-history.test.ts`, `backend/tests/integration/hand-history.test.ts`, and `frontend/tests/hand-history.test.tsx`.
- [X] T002 [P] Define shared history status, source type, terminal result, action, participant, and privacy projection types in `backend/src/modules/hand-history/hand-history.types.ts`.
- [X] T003 [P] Add representative terminal-hand fixtures for local game, multiplayer, and trainer sources, including authorized and unauthorized participants, in `backend/tests/helpers/hand-history.ts`.
- [X] T004 [P] Define stable error codes and HTTP mappings for unauthenticated, not-found, invalid-query, non-terminal publication, and retention-required cases in `backend/src/shared/errors.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish persistence, server authority, immutable ordering, and projection boundaries required by every user story.

**CRITICAL**: No user-story implementation begins until this phase is complete.

- [X] T005 Extend `backend/src/db/prisma/schema.prisma` with `HandHistory`, `HandHistoryParticipant`, `HandAction`, and `HistoryAccessPolicy` models using the data-model constraints: `sourceType + sourceId` is unique; `endedAt` is required for visible records; `sequence` is unique per hand; and participant seat numbers are unique within a hand.
- [X] T006 Create the versioned Prisma migration for the history tables, indexes for `(userId, endedAt)`, `(historyId, sequence)`, source idempotency, and filter fields in `backend/src/db/prisma/migrations/`.
- [X] T007 [P] Implement validated query parsing with `page` positive, `pageSize` from 1 through 100, `from <= to`, `sort=endedAt`, and `direction` limited to `asc|desc` in `backend/src/modules/hand-history/hand-history.validation.ts`.
- [X] T008 [P] Implement server-side history projection that omits raw deck, unauthorized private cards, internal engine state, and unauthorized participant identity in `backend/src/modules/hand-history/hand-history.projection.ts`.
- [X] T009 Implement repository primitives for terminal publication, idempotent `(sourceType, sourceId)` lookup, ordered actions, participant authorization, and policy updates in `backend/src/modules/hand-history/hand-history.repository.ts`.
- [X] T010 Implement the service boundary that accepts only terminal snapshots, rejects active/incomplete hands, and preserves immutable poker facts while allowing policy-only anonymization in `backend/src/modules/hand-history/hand-history.service.ts`.
- [X] T011 [P] Add foundational unit tests for query validation, projection redaction, contiguous action ordering, terminal-state validation, and source publication idempotency in `backend/tests/unit/hand-history/validation.test.ts`, `backend/tests/unit/hand-history/projection.test.ts`, and `backend/tests/unit/hand-history/service.test.ts`.

**Checkpoint**: History persistence, authorization, redaction, ordering, and idempotent terminal publication are ready for all user stories.

---

## Phase 3: User Story 1 - Consultar mis manos (Priority: P1) 🎯 MVP

**Goal**: Allow an authenticated player to list only their authorized terminal hands with a stable summary and empty state.

**Independent Test**: Publish terminal hands for two users, call the authenticated list endpoint for each user, and verify one authorized summary per matching hand with no foreign records or private data.

### Tests for User Story 1

- [X] T012 [P] [US1] Add contract tests for `GET /api/hand-history` covering authentication, authorized summaries, empty results, foreign-record isolation, and the absence of deck/private/internal fields in `backend/tests/contract/hand-history.test.ts`.
- [X] T013 [P] [US1] Add integration tests for terminal publication, duplicate publication, active-hand exclusion, and one-summary-per-history-record in `backend/tests/integration/hand-history.test.ts`.

### Implementation for User Story 1

- [X] T014 [US1] Implement authorized history list queries with stable secondary ordering by history ID and summary projection in `backend/src/modules/hand-history/hand-history.repository.ts` and `backend/src/modules/hand-history/hand-history.service.ts`.
- [X] T015 [US1] Implement authenticated `GET /api/hand-history` route registration and response envelope in `backend/src/modules/hand-history/hand-history.routes.ts` and `backend/src/app.ts`.
- [X] T016 [US1] Add the frontend history API client for list requests and typed loading, empty, unauthorized, and error states in `frontend/src/services/handHistoryApi.ts`.
- [X] T017 [US1] Build the authenticated history list page with summary rows, empty state, loading state, and authorization-safe fields in `frontend/src/pages/HandHistoryPage.tsx`.
- [X] T018 [US1] Add the history navigation entry and route wiring without changing existing Trainer, rooms, or local-game routes in `frontend/src/App.tsx` and `frontend/src/pages/ProfilePage.tsx`.
- [X] T019 [US1] Add frontend tests for the populated list, empty state, loading state, unauthorized response, and redacted summary fields in `frontend/tests/hand-history.test.tsx`.
- [X] T020 [US1] Run the focused US1 backend contract/integration tests and frontend tests, then record the independent MVP validation in `specs/009-hand-history/quickstart.md` if command paths need adjustment.

**Checkpoint**: An authenticated player can independently open a useful personal terminal-hand history without accessing another player's records.

---

## Phase 4: User Story 2 - Filtrar y ordenar el historial (Priority: P1)

**Goal**: Add bounded filters, deterministic sorting, and pagination that remain independently usable on the history list.

**Independent Test**: Seed hands across dates, formats, results, and participants; execute each filter alone and in combination across multiple pages; verify every returned row matches and no row is duplicated or skipped.

### Tests for User Story 2

- [X] T021 [P] [US2] Add contract tests for date, format, result, participant, page, pageSize, sort, direction, empty combinations, and invalid query errors in `backend/tests/contract/hand-history-filters.test.ts`.
- [X] T022 [P] [US2] Add integration tests for stable tie ordering, page traversal, concurrent terminal publication, and filters that cannot expand visibility in `backend/tests/integration/hand-history-filters.test.ts`.

### Implementation for User Story 2

- [X] T023 [US2] Implement indexed repository filtering and deterministic pagination using the validated `HandHistoryQuery` in `backend/src/modules/hand-history/hand-history.repository.ts`.
- [X] T024 [US2] Implement query validation errors, total counts, `hasNextPage`, and stable secondary ID ordering in `backend/src/modules/hand-history/hand-history.service.ts`.
- [X] T025 [US2] Extend `GET /api/hand-history` contract handling for all query parameters and bounded error responses in `backend/src/modules/hand-history/hand-history.routes.ts`.
- [X] T026 [US2] Add filter controls, sort direction, page navigation, result counts, and URL-backed query state in `frontend/src/pages/HandHistoryPage.tsx` and `frontend/src/services/handHistoryApi.ts`.
- [X] T027 [US2] Add frontend tests for each filter, combined filters, pagination boundaries, deterministic ordering, no-results state, and invalid-query feedback in `frontend/tests/hand-history-filters.test.tsx`.
- [X] T028 [US2] Add representative history-list performance coverage measuring first-page p50/p95 latency against the one-second p95 target in `backend/tests/performance/hand-history-performance.test.ts`.
- [X] T029 [US2] Run the US2 focused contract, integration, frontend, and performance checks from `specs/009-hand-history/quickstart.md` and verify that filters never reveal the existence of unauthorized records.

**Checkpoint**: The history remains useful at thousands of records with bounded, deterministic, privacy-safe navigation.

---

## Phase 5: User Story 3 - Revisar el detalle de una mano (Priority: P1)

**Goal**: Provide an authorized, ordered detail view containing the public board, actions, pots, result, and legitimate reveals.

**Independent Test**: Open a completed hand owned by the user and compare the response with the persisted action sequence; repeat as an unauthorized user and verify an indistinguishable not-found/denied outcome.

### Tests for User Story 3

- [X] T030 [P] [US3] Add contract tests for `GET /api/hand-history/:historyId` covering ordered actions, board, pots, result, legitimate reveals, legacy limitations, authentication, and foreign IDs in `backend/tests/contract/hand-history-detail.test.ts`.
- [X] T031 [P] [US3] Add integration tests for immutable action sequence, same-hand concurrent detail reads, terminal statuses (fold, all-in, showdown, abandoned), and legacy unavailable fields in `backend/tests/integration/hand-history-detail.test.ts`.

### Implementation for User Story 3

- [X] T032 [US3] Implement authorized detail retrieval with action ordering by `sequence`, participant projection, public snapshot projection, and `limitations` for unavailable legacy data in `backend/src/modules/hand-history/hand-history.repository.ts` and `backend/src/modules/hand-history/hand-history.service.ts`.
- [X] T033 [US3] Implement authenticated `GET /api/hand-history/:historyId` with non-enumerating `HAND_HISTORY_NOT_FOUND` behavior in `backend/src/modules/hand-history/hand-history.routes.ts`.
- [X] T034 [US3] Add typed detail retrieval and error handling to `frontend/src/services/handHistoryApi.ts`.
- [X] T035 [US3] Build the hand detail view with board, ordered streets/actions, pots, result, authorized reveals, limitations, and a back-to-history action in `frontend/src/pages/HandHistoryDetailPage.tsx`.
- [X] T036 [US3] Add frontend tests for action order, terminal result, missing legacy data, privacy redaction, loading, not-found, and back navigation in `frontend/tests/hand-history-detail.test.tsx`.
- [X] T037 [US3] Run the focused US3 security, contract, integration, and frontend tests from `specs/009-hand-history/quickstart.md` and verify that no response contains raw deck, future cards, or unauthorized private cards.

**Checkpoint**: An authorized player can independently inspect a completed hand without exposing hidden state or altering historical facts.

---

## Phase 6: User Story 4 - Eliminar o conservar registros según la política (Priority: P2)

**Goal**: Allow an authenticated user to request removal of their own history association while preserving shared-hand integrity through anonymization or restriction.

**Independent Test**: Request removal for an eligible personal record and for a shared record; verify idempotence, disappearance from the requester's list, and preservation of other participants' authorized history.

### Tests for User Story 4

- [X] T038 [P] [US4] Add contract tests for `DELETE /api/hand-history/:historyId` covering authentication, eligible anonymization, repeated requests, foreign IDs, and retention-required outcomes in `backend/tests/contract/hand-history-privacy.test.ts`.
- [X] T039 [P] [US4] Add integration tests for policy updates, shared participant retention, anonymized display names, list disappearance, and no mutation of immutable poker facts in `backend/tests/integration/hand-history-privacy.test.ts`.

### Implementation for User Story 4

- [X] T040 [US4] Implement policy-aware anonymization/restriction updates that preserve shared hand facts and remove the requesting user's list visibility in `backend/src/modules/hand-history/hand-history.repository.ts` and `backend/src/modules/hand-history/hand-history.service.ts`.
- [X] T041 [US4] Implement authenticated idempotent `DELETE /api/hand-history/:historyId` with explicit retention-required response behavior in `backend/src/modules/hand-history/hand-history.routes.ts`.
- [X] T042 [US4] Add the privacy request action, confirmation, success, retention limitation, and error states to `frontend/src/pages/HandHistoryDetailPage.tsx` and `frontend/src/services/handHistoryApi.ts`.
- [X] T043 [US4] Add frontend tests for successful anonymization, repeated requests, shared-record limitation, and ensuring removed records no longer appear in the user's list in `frontend/tests/hand-history-privacy.test.tsx`.
- [X] T044 [US4] Run the focused US4 authorization, privacy, integration, and frontend tests from `specs/009-hand-history/quickstart.md` and verify that other participants' authorized views remain intact.

**Checkpoint**: Users control their personal history association without corrupting shared historical hands.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Complete source integrations, regression coverage, documentation, security, and the full quickstart.

- [X] T045 [P] Add terminal publication adapters for persistible local-game, multiplayer, and trainer sources, keeping source-specific rules in their existing modules and the history boundary in `backend/src/modules/hand-history/hand-history.publisher.ts`, `backend/src/modules/local-games/`, `backend/src/modules/multiplayer/`, and `backend/src/modules/trainer/`.
- [X] T046 [P] Add cross-source publication and privacy regression coverage for local game, multiplayer, and trainer snapshots in `backend/tests/integration/hand-history-sources.test.ts`.
- [X] T047 [P] Add security regression coverage for ID enumeration, foreign-user access, private cards, raw deck leakage, active-hand leakage, and unauthorized participant filters in `backend/tests/contract/hand-history-security.test.ts`.
- [X] T048 Update `backend/README.md`, `README.md`, and `specs/009-hand-history/quickstart.md` with setup, endpoints, privacy behavior, retention policy, and the Feature 010–013 roadmap.
- [X] T049 Run Prisma validation and migration deployment with `npx.cmd prisma validate --schema src/db/prisma/schema.prisma` and `npx.cmd prisma migrate deploy --schema src/db/prisma/schema.prisma` from `backend/`.
- [X] T050 Run the complete backend suite and build from `backend/` using `npm.cmd test -- --run` and `npm.cmd run build`.
- [X] T051 Run the complete frontend suite and build from `frontend/` using `npm.cmd test -- --run` and `npm.cmd run build`.
- [X] T052 Execute every manual authenticated scenario in `specs/009-hand-history/quickstart.md` and record any contract or privacy discrepancy before marking the feature complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001-T004 establish the module, vocabulary, fixtures, and error names; tasks can run in parallel after paths are agreed.
- **Foundational (Phase 2)**: T005-T011 depend on setup and block all user stories.
- **User Story 1 (Phase 3)**: Depends on the foundational persistence and projection boundary; delivers the MVP list.
- **User Story 2 (Phase 4)**: Depends on US1 list projection and repository query primitives; adds filters and pagination.
- **User Story 3 (Phase 5)**: Depends on foundational projection and can run in parallel with US2 after the shared history contract exists.
- **User Story 4 (Phase 6)**: Depends on foundational policies and can begin after the history detail authorization boundary exists.
- **Polish (Phase 7)**: Depends on all desired stories and includes cross-source integration and full validation.

### User Story Dependencies

- **US1 (P1)**: Foundational only; independent MVP for personal terminal-history summaries.
- **US2 (P1)**: Foundational + US1 list contract; independently testable once summaries exist.
- **US3 (P1)**: Foundational only; independent detail slice, although it reuses the history ID and projection boundary.
- **US4 (P2)**: Foundational + authorized detail/policy data; independently testable with seeded records.

### Parallel Opportunities

- **Setup**: T002, T003, and T004 can run in parallel after T001 defines the module paths.
- **Foundational**: T007, T008, and T011 can run in parallel after the schema shape in T005 is agreed; T009 and T010 depend on the schema.
- **US1**: T012 and T013 can run in parallel; T016 and T019 can run in parallel after the API shape is stable.
- **US2**: T021, T022, and T027 can run in parallel; T023 and T026 can proceed separately after validation types exist.
- **US3**: T030, T031, and T036 can run in parallel; backend detail work and frontend detail work can proceed after the contract is fixed.
- **US4**: T038, T039, and T043 can run in parallel; repository policy work precedes route wiring.
- **Polish**: T045, T046, and T047 can run in parallel before documentation and full-suite validation.

## Parallel Example: User Story 1

```text
Task: "T012 [P] [US1] Contract tests for GET /api/hand-history in backend/tests/contract/hand-history.test.ts"
Task: "T013 [P] [US1] Integration tests for terminal publication in backend/tests/integration/hand-history.test.ts"
Task: "T016 [US1] Add the frontend history API client in frontend/src/services/handHistoryApi.ts"
```

## Parallel Example: User Story 3

```text
Task: "T030 [P] [US3] Detail contract tests in backend/tests/contract/hand-history-detail.test.ts"
Task: "T031 [P] [US3] Detail integration tests in backend/tests/integration/hand-history-detail.test.ts"
Task: "T036 [US3] Detail frontend tests in frontend/tests/hand-history-detail.test.tsx"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup and Phase 2 foundational persistence, authorization, projection, and idempotent publication.
2. Complete Phase 3 US1 list, summary, empty state, and privacy-safe authenticated experience.
3. Run T012-T020 independently and verify the first-page query, terminal-only records, and cross-user isolation.
4. Stop at the US1 checkpoint for the first usable history release.

### Incremental Delivery

1. Add US2 filters, pagination, deterministic ordering, and performance validation.
2. Add US3 authorized detail and ordered action review.
3. Add US4 anonymization/restriction and privacy controls.
4. Add cross-source adapters, security regression coverage, documentation, and full quickstart validation.
5. Keep replay, analytics, administration, and multiplayer training for Features 010-013.

## Notes

- Every task uses the required `- [ ] T###` checklist format and names at least one concrete repository path.
- `[P]` marks tasks that can proceed independently without incomplete-file dependencies.
- `[US#]` maps every user-story task to the corresponding specification story.
- Tests precede implementation within each story where the contract is being introduced.
- The server remains authoritative for authorization, visibility, terminal state, and immutable historical facts.
