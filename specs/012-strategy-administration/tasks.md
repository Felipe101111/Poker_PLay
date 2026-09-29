# Tasks: Administración de estrategia versionada

**Input**: Design documents from `/specs/012-strategy-administration/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/strategy-administration-http.md](contracts/strategy-administration-http.md), [quickstart.md](quickstart.md)

**Organization**: Tasks are grouped by user story. User stories are implemented incrementally after the shared foundation and remain independently testable at their checkpoints.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the existing backend/frontend modules and test surfaces without introducing a new project.

- [X] T001 Create the Feature 012 strategy administration module/test file structure in `backend/src/modules/strategy/`, `backend/tests/`, `frontend/src/pages/`, `frontend/src/services/`, and `frontend/tests/` according to `specs/012-strategy-administration/plan.md`.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish persistence, authorization, validation, errors, and transaction primitives required by every user story.

- [X] T002 Extend `backend/src/db/prisma/schema.prisma` with `StrategyDataset`, `DRAFT` strategy status, `EditorialRole`, `EditorialAuditEntry`, publication records, draft revision, compatibility key, validation report, and the relationships/indexes defined in `specs/012-strategy-administration/data-model.md`.
- [X] T003 Create the Prisma migration under `backend/src/db/prisma/migrations/` that preserves existing published `StrategyDatasetVersion` and `StrategyRow` data while adding the new enums, columns, tables, indexes, and active compatibility uniqueness constraint.
- [X] T004 Add server-side editorial role resolution and capability guards in `backend/src/modules/strategy/strategy.authorization.ts`, mapping `USER`, `EDITOR`, `REVIEWER`, `PUBLISHER`, and `ADMIN` to the operations in `specs/012-strategy-administration/contracts/strategy-administration-http.md`.
- [X] T005 Add stable administration error codes and response mapping in `backend/src/modules/strategy/strategy.admin.errors.ts` for `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, `DRAFT_CONFLICT`, `INVALID_STATE_TRANSITION`, `ACTIVE_VERSION_CONFLICT`, `RETIRE_REASON_REQUIRED`, and `INVALID_INPUT`.
- [X] T006 [P] Add shared administrative types and request/response schemas in `backend/src/modules/strategy/strategy.admin.types.ts` and `backend/src/modules/strategy/strategy.admin.validation.ts`, including non-negative frequencies, sum `1` within `0.000001`, required context, and server-owned fields.
- [X] T007 [P] Add pure validation and compatibility-key functions in `backend/src/modules/strategy/strategy.admin.validation.ts` for empty drafts, duplicate logical contexts, incompatible rows, invalid actions, and canonical dataset compatibility.
- [X] T008 Add database-backed test fixtures and role/session helpers in `backend/tests/fixtures/strategy-administration.ts` for users, datasets, drafts, published versions, snapshots, and each editorial role.

**Checkpoint**: Prisma schema/migration, authorization, errors, shared validation, and fixtures are ready; user-story work can proceed.

## Phase 3: User Story 1 - Crear y preparar una versión estratégica (Priority: P1) 🎯 MVP

**Goal**: Allow an authorized editor to create a dataset draft, edit valid rows, inspect it, and preserve the currently published Trainer behavior.

**Independent Test**: An `EDITOR` creates a draft, adds valid rows, reads the draft, and receives `403` without draft data when a base `USER` attempts the same operations; the existing published lookup remains unchanged.

### Tests for User Story 1

- [X] T009 [P] [US1] Add contract tests for dataset/draft creation and draft update/read responses in `backend/tests/contract/strategy-administration-drafts.contract.test.ts` using the HTTP shapes from `specs/012-strategy-administration/contracts/strategy-administration-http.md`.
- [X] T010 [P] [US1] Add integration tests for authorized draft creation, valid row replacement, immutable published-version rejection, and unauthorized redaction in `backend/tests/integration/strategy-administration-drafts.integration.test.ts`.

### Implementation for User Story 1

- [X] T011 [P] [US1] Extend domain types and Zod schemas in `backend/src/modules/strategy/strategy.admin.types.ts` and `backend/src/modules/strategy/strategy.admin.validation.ts` for dataset metadata, draft metadata, draft rows, and `expectedRevision`.
- [X] T012 [US1] Implement dataset/draft persistence queries and row replacement in `backend/src/modules/strategy/strategy.admin.repository.ts`, allowing edits only for `DRAFT` and returning no protected draft content to unauthorized callers.
- [X] T013 [US1] Implement draft creation, retrieval, metadata update, row replacement, revision increment, and published/retired immutability in `backend/src/modules/strategy/strategy.admin.service.ts`.
- [X] T014 [US1] Add authenticated administration routes for `GET/POST /api/strategy/admin/datasets`, `POST /api/strategy/admin/datasets/:datasetId/versions`, `GET /api/strategy/admin/versions/:versionId`, and `PUT /api/strategy/admin/versions/:versionId` in `backend/src/modules/strategy/strategy.admin.routes.ts`, then register them in `backend/src/app.ts`.
- [X] T015 [P] [US1] Add the typed draft API client and request state helpers in `frontend/src/services/strategyAdministrationApi.ts` and `frontend/src/pages/strategyAdministrationState.ts`, preserving server error codes and revisions.
- [X] T016 [US1] Build the protected draft editor and dataset/version catalog in `frontend/src/pages/StrategyAdministrationPage.tsx`, including loading, empty, access-denied, validation-message, and unsaved/conflict states.
- [X] T017 [US1] Add React Testing Library coverage for draft creation/editing, server-owned fields, unauthorized state, and stale revision messaging in `frontend/tests/strategy-administration-drafts.test.tsx`.

**Checkpoint**: US1 is independently usable and testable without publishing or audit-history UI beyond the foundation needed to create the draft.

## Phase 4: User Story 2 - Validar y publicar una versión (Priority: P1)

**Goal**: Validate a complete draft and publish it atomically so the Trainer uses only a valid active version while historical snapshots remain unchanged.

**Independent Test**: An invalid draft returns row-level validation errors and stays `DRAFT`; a valid draft publishes as immutable, replaces only the compatible active version, and the Trainer lookup returns the new version for new evaluations.

### Tests for User Story 2

- [X] T018 [P] [US2] Add contract tests for validation and publish responses/errors in `backend/tests/contract/strategy-administration-publication.contract.test.ts`.
- [X] T019 [P] [US2] Add unit tests for frequency totals, duplicate logical contexts, compatibility keys, empty drafts, and validation reports in `backend/tests/unit/strategy/strategy-administration-validation.test.ts`.
- [X] T020 [US2] Add integration tests for failed validation, atomic publish rollback, active-version replacement, idempotent publish retry, and historical snapshot preservation in `backend/tests/integration/strategy-administration-publication.integration.test.ts`.

### Implementation for User Story 2

- [X] T021 [US2] Implement persisted validation reports and row-level issue mapping in `backend/src/modules/strategy/strategy.admin.service.ts` and `backend/src/modules/strategy/strategy.admin.validation.ts`, requiring no blocking issues before publish.
- [X] T022 [US2] Implement transactional `DRAFT -> PUBLISHED` publication, active compatibility replacement, content hashing, and audit/publication records in `backend/src/modules/strategy/strategy.admin.repository.ts`.
- [X] T023 [US2] Add `POST /api/strategy/admin/versions/:versionId/validate` and `POST /api/strategy/admin/versions/:versionId/publish` routes with `REVIEWER`/`PUBLISHER` checks in `backend/src/modules/strategy/strategy.admin.routes.ts`.
- [X] T024 [US2] Update `backend/src/modules/strategy/strategy.repository.ts`, `backend/src/modules/strategy/strategy.service.ts`, and `backend/src/modules/strategy/strategy.validation.ts` so Trainer lookup ignores drafts/retired versions, selects one active compatible publication, and preserves `UNAVAILABLE` behavior.
- [X] T025 [P] [US2] Add validation report, publish confirmation, replacement state, and failed-publication UI flows in `frontend/src/pages/StrategyAdministrationPage.tsx` and `frontend/src/services/strategyAdministrationApi.ts`.

**Checkpoint**: US1 and US2 both work; invalid strategy data cannot publish, valid data publishes atomically, and existing Trainer evaluation behavior remains historical and server-authoritative.

## Phase 5: User Story 3 - Retirar, consultar y auditar versiones (Priority: P2)

**Goal**: Let authorized platform owners retire faulty publications, inspect version history, and audit all editorial operations without altering historical evaluations.

**Independent Test**: An authorized publisher retires a published version with a reason, an authorized reviewer sees the complete history, an admin sees audit entries and can assign roles, and historical snapshots retain original strategy data.

### Tests for User Story 3

- [X] T026 [P] [US3] Add contract tests for retirement, history, audit, and role-assignment endpoints in `backend/tests/contract/strategy-administration-governance.contract.test.ts`.
- [X] T027 [P] [US3] Add integration/security tests for role boundaries, audit redaction, retirement fallback/unavailability, repeated retirement, and unauthorized history access in `backend/tests/security/strategy-administration-governance.security.test.ts`.
- [X] T028 [US3] Add integration tests for retirement, chronological history, actor/motive metadata, and immutable historical snapshots in `backend/tests/integration/strategy-administration-governance.integration.test.ts`.

### Implementation for User Story 3

- [X] T029 [US3] Implement transactional `PUBLISHED -> RETIRED` retirement with mandatory reason, publication record, idempotent retry behavior, and explicit no-compatible-version result in `backend/src/modules/strategy/strategy.admin.repository.ts` and `backend/src/modules/strategy/strategy.admin.service.ts`.
- [X] T030 [US3] Implement append-only audit writes and filtered history queries in `backend/src/modules/strategy/strategy.admin.repository.ts`, excluding passwords, tokens, private cards, and raw sensitive payloads.
- [X] T031 [US3] Add `GET /api/strategy/admin/datasets/:datasetId/history`, `GET /api/strategy/admin/audit`, `POST /api/strategy/admin/versions/:versionId/retire`, and `PATCH /api/strategy/admin/users/:userId/role` in `backend/src/modules/strategy/strategy.admin.routes.ts`.
- [X] T032 [US3] Add history, retirement, audit, and role-management views with role-aware controls and required retirement reason in `frontend/src/pages/StrategyAdministrationPage.tsx` and `frontend/src/pages/strategyAdministrationState.ts`.
- [X] T033 [US3] Add React Testing Library coverage for history/audit rendering, retirement confirmation, no-alternative availability, and admin-only role management in `frontend/tests/strategy-administration-governance.test.tsx`.

**Checkpoint**: All three user stories are independently verifiable; publication history, retirement, role assignment, and audit preserve data integrity and privacy.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish documentation, performance validation, full regression, and the quickstart gate.

- [X] T034 [P] Update `README.md` and `backend/README.md` with editorial roles, lifecycle states, API boundaries, migration notes, and the Feature 012 quickstart.
- [X] T035 Add history-query performance coverage for 1,000 versions and bounded audit filters in `backend/tests/performance/strategy-administration.performance.test.ts`, targeting the spec's 95th-percentile under-2-second outcome.
- [ ] T036 Run the complete backend and frontend builds/tests plus the scenarios in `specs/012-strategy-administration/quickstart.md`, recording any unrelated baseline failures without changing scope.
- [X] T037 Review `backend/src/modules/strategy/` and `frontend/src/` for duplicated authorization/validation logic, remove dead administration paths, and run lint/build checks before completion.

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies; establishes the touched file structure.
- **Phase 2 Foundational**: Depends on T001 and blocks all user stories; schema, roles, errors, validation, and fixtures must exist first.
- **Phase 3 US1**: Depends on T002-T008; delivers the MVP draft workflow.
- **Phase 4 US2**: Depends on the shared foundation and the draft model/service from T012-T014; adds validation and publication to US1.
- **Phase 5 US3**: Depends on publication records and roles from US2; adds retirement, history, audit, and role administration.
- **Phase 6 Polish**: Depends on all selected stories and their focused tests.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2; no dependency on another user story.
- **US2 (P1)**: Starts after Phase 2 and consumes the draft contract from US1; must preserve US1 behavior.
- **US3 (P2)**: Depends on the published-version and role foundations of US2; must preserve US1/US2 behavior.

### Parallel Opportunities

- T006-T007 can run in parallel after the schema direction is agreed; T008 can run in parallel with shared type/validation work.
- Within US1, T009/T010 and T015 can run in parallel; T012/T013 remain ordered before T014.
- Within US2, T018/T019 can run in parallel with T021; T025 can run in parallel with backend route work after the API shapes are fixed.
- Within US3, T026/T027 can run in parallel with T030; T032 can run in parallel with backend history implementation after contract shapes are stable.
- T034 can run in parallel with T035 once the route surface is stable; T036/T037 remain final gates.

## Parallel Execution Examples

### User Story 1

```text
Task T009: Contract tests in backend/tests/contract/strategy-administration-drafts.contract.test.ts
Task T010: Integration tests in backend/tests/integration/strategy-administration-drafts.integration.test.ts
Task T015: API client/state in frontend/src/services/strategyAdministrationApi.ts and frontend/src/pages/strategyAdministrationState.ts
```

### User Story 2

```text
Task T018: Publication contract tests in backend/tests/contract/strategy-administration-publication.contract.test.ts
Task T019: Pure validation tests in backend/tests/unit/strategy-administration-validation.test.ts
Task T025: Validation/publish UI in frontend/src/pages/StrategyAdministrationPage.tsx
```

### User Story 3

```text
Task T026: Governance contract tests in backend/tests/contract/strategy-administration-governance.contract.test.ts
Task T027: Authorization/security tests in backend/tests/security/strategy-administration-governance.security.test.ts
Task T032: History/audit UI in frontend/src/pages/StrategyAdministrationPage.tsx
```

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 setup and Phase 2 foundation.
2. Complete Phase 3 US1 draft creation/editing and its focused contract, integration, and UI tests.
3. Stop and validate the independent US1 test: editors can prepare isolated drafts, unauthorized users cannot read them, and the existing published Trainer lookup is unchanged.

### Incremental Delivery

1. Foundation ready: schema, role checks, errors, validators, and fixtures.
2. Add US1: draft authoring and editing; validate independently.
3. Add US2: validation and atomic publication; validate Trainer regression.
4. Add US3: retirement, history, audit, and role management; validate governance/security.
5. Complete polish, quickstart, performance, builds, and full regression.

### Parallel Team Strategy

1. One developer completes Phase 1-2 together because the migration and shared auth/validation contracts are blocking.
2. After Phase 2, one developer owns US1 backend/API while another owns US1 UI/tests.
3. After US1 contracts stabilize, backend publication and frontend publication flows can proceed in parallel.
4. US3 governance backend and UI can proceed in parallel after the publication records and role mapping are available.

## Notes

- Every implementation task has a sequential `T###` ID, a checkbox, an optional `[P]` marker only where parallel work is safe, a required story label for user-story phases, and at least one concrete repository file path.
- Tests are included because the feature specification defines independent test scenarios and the constitution makes authorization, data integrity, and critical domain logic mandatory to verify.
- The MVP is intentionally limited to US1; publishing, retirement, audit, and role assignment remain incremental additions.
