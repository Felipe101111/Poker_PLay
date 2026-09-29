# Tasks: Analytics de rendimiento de poker

**Input**: Design documents from `/specs/011-analytics-dashboard/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/hand-analytics-http.md](contracts/hand-analytics-http.md), [quickstart.md](quickstart.md)

**Tests**: Included because the specification defines independent tests, the quickstart requires focused suites, and privacy, metric correctness, and insufficient-sample behavior are critical.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared analytics types, fixtures, and test boundaries without changing poker rules or persistence.

- [X] T001 [P] Define shared analytics filter, metric, limitation, trend, breakdown, related-hand, and response types in `backend/src/modules/hand-history/hand-history.analytics.types.ts`
- [X] T002 [P] Add frontend analytics filter, metric, limitation, trend, breakdown, related-hand, and response types in `frontend/src/services/handAnalyticsApi.ts`
- [X] T003 [P] Add representative analytics fixtures for complete, insufficient, unavailable, empty, and privacy-restricted histories in `backend/tests/helpers/hand-analytics.ts`
- [X] T004 [P] Add representative dashboard response fixtures for summary, trend, breakdowns, limitations, and related hands in `frontend/tests/fixtures/hand-analytics.ts`
- [X] T005 [P] Document the public snapshot analytics input keys and backward-compatible absence behavior in `backend/src/modules/hand-history/hand-history.types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the authorized read boundary, validation, and deterministic calculation primitives required by every user story.

**CRITICAL**: No user story implementation can begin until this phase is complete.

- [X] T006 [P] Add Zod validation for `from`, `to`, `format`, and `relatedLimit` with `relatedLimit` constrained to 1-50 in `backend/src/modules/hand-history/hand-history.validation.ts`
- [X] T007 [P] Add analytics-specific API error codes for invalid ranges, unavailable data, and safe authorization handling in `backend/src/shared/errors.ts`
- [X] T008 Implement authorized terminal-history lookup using `canList = true`, stable `endedAt`/`id` ordering, ordered actions, participants, and policies in `backend/src/modules/hand-history/hand-history.repository.ts`
- [X] T009 Implement privacy-safe snapshot analytics extraction that ignores unknown and sensitive keys and returns `DATA_UNAVAILABLE` when public analytics input is absent in `backend/src/modules/hand-history/hand-history.analytics.ts`
- [X] T010 Implement deterministic metric helpers that return `value`, `numerator`, `denominator`, `sampleThreshold`, and `isSufficient`, using threshold 30 and `null` for zero denominators in `backend/src/modules/hand-history/hand-history.analytics.ts`
- [X] T011 Add the authenticated analytics route registration without changing existing history detail, replay, or removal route behavior in `backend/src/modules/hand-history/hand-history.routes.ts`
- [X] T012 Add foundational unit coverage for filter parsing, metric denominators, threshold behavior, zero denominators, sensitive-key omission, and source immutability in `backend/tests/unit/hand-history/hand-analytics.foundation.test.ts`

**Checkpoint**: The authorized, privacy-safe calculation boundary and validated query shape are ready for independent user stories.

---

## Phase 3: User Story 1 - Consultar el rendimiento general (Priority: P1) 🎯 MVP

**Goal**: An authenticated player can open a personal dashboard with hands played, net result, EV, win rate, ROI availability, and real-versus-EV trend data.

**Independent Test**: Given terminal histories with complete public analytics input, request the analytics document and verify the summary and trend against an independent calculation; verify empty histories return an actionable empty state.

### Tests for User Story 1

- [X] T013 [P] [US1] Add contract coverage for authenticated analytics success, unauthenticated rejection, invalid filters, summary fields, and trend shape in `backend/tests/contract/hand-analytics.test.ts`
- [X] T014 [P] [US1] Add unit coverage for net result, EV, win rate, ROI availability, daily trend ordering, and no-results limitations in `backend/tests/unit/hand-history/hand-analytics.summary.test.ts`
- [X] T015 [P] [US1] Add integration coverage proving a personal summary aggregates only authorized terminal histories and performs no writes in `backend/tests/integration/hand-analytics-summary.test.ts`
- [X] T016 [P] [US1] Add dashboard coverage for loading, summary cards, trend display, empty state, and safe error display in `frontend/tests/analytics-summary.test.tsx`

### Implementation for User Story 1

- [X] T017 [P] [US1] Implement summary and trend calculation over eligible public hand analytics input in `backend/src/modules/hand-history/hand-history.analytics.ts`
- [X] T018 [US1] Implement `getAnalytics(userId, filters)` response construction for filters, summary, trend, empty results, and global limitations in `backend/src/modules/hand-history/hand-history.service.ts` (depends on T008-T010, T017)
- [X] T019 [US1] Implement `GET /api/hand-history/analytics` success and standard error handling in `backend/src/modules/hand-history/hand-history.routes.ts` (depends on T006, T011, T018)
- [X] T020 [US1] Implement typed `handAnalyticsApi.get(filters)` with encoded query parameters in `frontend/src/services/handAnalyticsApi.ts` (depends on T002, T019)
- [X] T021 [US1] Create the analytics page loading, error, summary, trend, empty, and limitation states in `frontend/src/pages/AnalyticsPage.tsx` (depends on T020)
- [X] T022 [US1] Add the `/analytics` route and authenticated navigation entry without altering existing routes in `frontend/src/App.tsx`
- [X] T023 [US1] Add stable accessible names and responsive layout structure for summary and trend sections in `frontend/src/pages/AnalyticsPage.tsx`

**Checkpoint**: User Story 1 is independently functional: a player can open a personal summary and understand available net result, EV, and trend data.

---

## Phase 4: User Story 2 - Analizar patrones de decisión (Priority: P1)

**Goal**: A player can inspect VPIP, PFR, 3-bet, and win rate overall, by position, and by street with denominators and sample warnings.

**Independent Test**: Request a filtered dataset with known action observations and verify each metric, position row, street row, denominator, and insufficient-sample limitation against an independent calculation.

### Tests for User Story 2

- [X] T024 [P] [US2] Add contract assertions for overall decision metrics, position breakdowns, street breakdowns, denominators, and limitation codes in `backend/tests/contract/hand-analytics-metrics.test.ts`
- [X] T025 [P] [US2] Add unit coverage for VPIP, PFR, 3-bet, win rate, fixed position ordering, street scopes, and denominator-zero behavior in `backend/tests/unit/hand-history/hand-analytics.metrics.test.ts`
- [X] T026 [P] [US2] Add integration coverage comparing analytics metrics with an independent fixture calculation and verifying no private observations contribute in `backend/tests/integration/hand-analytics-metrics.test.ts`
- [X] T027 [P] [US2] Add frontend coverage for metric cards, position/street breakdown tables, insufficient-sample labels, null metrics, and denominator display in `frontend/tests/analytics-metrics.test.tsx`

### Implementation for User Story 2

- [X] T028 [P] [US2] Implement public observation extraction for VPIP, PFR, 3-bet, win rate, position, and street scopes in `backend/src/modules/hand-history/hand-history.analytics.ts`
- [X] T029 [US2] Implement overall decision metrics, position rows, street rows, fixed ordering, and per-row limitations in `backend/src/modules/hand-history/hand-history.analytics.ts` (depends on T010, T028)
- [X] T030 [US2] Add `overall`, `byPosition`, and `byStreet` to the analytics service response without changing the endpoint envelope in `backend/src/modules/hand-history/hand-history.service.ts` (depends on T018, T029)
- [X] T031 [US2] Render VPIP, PFR, 3-bet, win rate, denominators, and sample sufficiency in `frontend/src/pages/AnalyticsPage.tsx` (depends on T021, T030)
- [X] T032 [US2] Add keyboard-accessible tabs or equivalent controls for position/street breakdown views in `frontend/src/pages/AnalyticsPage.tsx`

**Checkpoint**: User Stories 1 and 2 are independently testable; descriptive metrics never conceal insufficient or unavailable samples.

---

## Phase 5: User Story 3 - Filtrar y comparar períodos (Priority: P1)

**Goal**: A player can filter analytics by date and modality and see every dashboard section update to the same effective scope.

**Independent Test**: Apply date and format filters to histories from different scopes and verify that summary, trends, metrics, breakdowns, limitations, and related-hand counts all use only the selected subset.

### Tests for User Story 3

- [X] T033 [P] [US3] Add contract coverage for date bounds, format filtering, reversed dates, unsupported limits, and normalized effective filters in `backend/tests/contract/hand-analytics-filters.test.ts`
- [X] T034 [P] [US3] Add integration coverage proving filter scope consistency across summary, trend, metrics, breakdowns, and related-hand candidates in `backend/tests/integration/hand-analytics-filters.test.ts`
- [X] T035 [P] [US3] Add frontend coverage for date inputs, format selection, applying filters, clearing filters, invalid range messages, and no-results state in `frontend/tests/analytics-filters.test.tsx`

### Implementation for User Story 3

- [X] T036 [US3] Wire validated date and format filters into the authorized repository query with stable ordering and no policy bypass in `backend/src/modules/hand-history/hand-history.repository.ts` (depends on T006, T008)
- [X] T037 [US3] Echo normalized filters and eligible-hand count and ensure all analytics sections consume one filtered record set in `backend/src/modules/hand-history/hand-history.service.ts` (depends on T018, T036)
- [X] T038 [US3] Implement controlled date and format filter state synchronized with the analytics URL in `frontend/src/pages/analyticsState.ts`
- [X] T039 [US3] Render filter controls, validation, apply/reset behavior, and effective scope in `frontend/src/pages/AnalyticsPage.tsx` (depends on T021, T038)
- [X] T040 [US3] Update the analytics API client and page loading flow so stale responses cannot overwrite newer filter results in `frontend/src/services/handAnalyticsApi.ts` and `frontend/src/pages/AnalyticsPage.tsx`
- [X] T041 [US3] Preserve or explicitly restore filter context when navigating from analytics to history detail or replay in `frontend/src/pages/AnalyticsPage.tsx`

**Checkpoint**: All P1 stories are independently testable; changing filters cannot mix results from different scopes.

---

## Phase 6: User Story 4 - Investigar manos relacionadas (Priority: P2)

**Goal**: A player can inspect the visible hands contributing to a metric and open authorized detail or replay without receiving raw historical state.

**Independent Test**: Select a metric with known contributing histories, verify the bounded related-hand list and contribution labels, then open detail/replay and confirm privacy and navigation behavior.

### Tests for User Story 4

- [X] T042 [P] [US4] Add contract coverage for bounded related hands, contribution labels, detail/replay availability, and omission of raw state or private fields in `backend/tests/contract/hand-analytics-related.test.ts`
- [X] T043 [P] [US4] Add integration coverage proving related hands obey list/detail/replay policies and cannot enumerate another user's histories in `backend/tests/integration/hand-analytics-related.test.ts`
- [X] T044 [P] [US4] Add frontend coverage for related-hand rows, metric contribution labels, detail/replay links, unavailable replay messaging, and privacy-safe rendering in `frontend/tests/analytics-related-hands.test.tsx`

### Implementation for User Story 4

- [X] T045 [US4] Implement bounded related-hand projection with contribution labels and `canOpenDetail`/`canOpenReplay` flags in `backend/src/modules/hand-history/hand-history.analytics.ts` (depends on T008, T029, T037)
- [X] T046 [US4] Add related hands and limit enforcement to the analytics service response without embedding raw snapshots or actions in `backend/src/modules/hand-history/hand-history.service.ts` (depends on T045)
- [X] T047 [US4] Render related-hand rows with safe empty and unavailable states in `frontend/src/pages/AnalyticsPage.tsx` (depends on T031, T046)
- [X] T048 [US4] Add links to existing history detail and replay routes while preserving authorization errors and filter context in `frontend/src/pages/AnalyticsPage.tsx`
- [X] T049 [US4] Add frontend navigation state helpers for returning to analytics with the prior effective filters in `frontend/src/pages/analyticsState.ts`

**Checkpoint**: A player can move from an aggregate signal to authorized evidence without client-side reconstruction or privacy leakage.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Harden privacy, performance, accessibility, documentation, and regression behavior across all stories.

- [X] T050 [P] Add performance coverage for representative histories, bounded related-hand payloads, and the two-second summary target in `backend/tests/performance/hand-analytics-performance.test.ts`
- [X] T051 [P] Add security/privacy regression coverage for unauthenticated requests, unauthorized histories, hidden fields, anonymized participants, and ID enumeration in `backend/tests/contract/hand-analytics-security.test.ts`
- [X] T052 [P] Add frontend accessibility coverage for keyboard controls, labels, table semantics, chart alternatives, loading, empty, and limitation states in `frontend/tests/analytics-accessibility.test.tsx`
- [X] T053 [P] Document the analytics endpoint, metric semantics, limitations, filters, and privacy boundary in `README.md` and `backend/README.md`
- [X] T054 Verify backward compatibility for histories without `publicSnapshot.analytics` and confirm no Prisma migration is introduced in `backend/src/modules/hand-history/hand-history.types.ts`, `backend/src/db/prisma/schema.prisma`, and `backend/tests/integration/hand-analytics-legacy.test.ts`
- [X] T055 Run all Feature 011 quickstart scenarios, backend focused tests/build, and frontend focused tests/build; record any corrections in `specs/011-analytics-dashboard/quickstart.md`
- [X] T056 Run the full backend and frontend regression suites and verify authentication, hand history, replay, rooms, multiplayer, trainer, equity, strategy, and existing navigation remain green in `backend/tests/` and `frontend/tests/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001-T005 can run in parallel; they establish shared types, fixtures, and the public snapshot analytics boundary.
- **Foundational (Phase 2)**: Depends on Setup; T006-T012 establish validation, authorization, projection primitives, route registration, and foundation tests. This phase blocks all stories.
- **User Stories (Phase 3+)**: Depend on the Foundational phase. US1 is the suggested MVP; US2 and US3 can then proceed in parallel after the shared analytics response exists. US4 depends on the related-hand shape and filter scope from US1-US3.
- **Polish (Phase 7)**: Depends on all desired stories; T050-T054 can run in parallel, then T055-T056 execute the quickstart and full regression.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2 and is independently deliverable as the personal summary/trend MVP.
- **User Story 2 (P1)**: Starts after Phase 2; shares the analytics document and can be tested independently with metric fixtures.
- **User Story 3 (P1)**: Starts after Phase 2; it integrates with US1/US2 response sections but is independently testable through scoped fixture sets.
- **User Story 4 (P2)**: Depends on the authorized filtered document from US1-US3, then remains independently testable through bounded related-hand fixtures.

### Within Each User Story

- Tests are created before implementation and should initially fail.
- Shared types and validation precede repository/service changes.
- Backend authorization and calculation precede frontend rendering.
- Each checkpoint must pass its independent test before the next story is considered complete.

### Parallel Opportunities

- T001-T005 are independent setup tasks across backend types, frontend types, and fixtures.
- T006-T010 and T012 can run in parallel before route/service integration; T011 follows the route boundary.
- US1 tests T013-T016 can run in parallel; T017 and T020 can proceed once foundational types exist.
- US2 tests T024-T027 can run in parallel; metric extraction and UI work are separable after T010.
- US3 tests T033-T035 can run in parallel; repository and frontend filter state touch different files.
- US4 tests T042-T044 can run in parallel; projection and UI integration follow the shared contract.
- T050-T054 are parallel polish tasks before T055-T056.

---

## Parallel Example: User Story 1

```text
Task: "T013 [US1] Contract coverage in backend/tests/contract/hand-analytics.test.ts"
Task: "T014 [US1] Summary unit coverage in backend/tests/unit/hand-history/hand-analytics.summary.test.ts"
Task: "T016 [US1] Dashboard summary coverage in frontend/tests/analytics-summary.test.tsx"

After the tests and shared types are ready:
Task: "T017 [US1] Summary and trend calculation in backend/src/modules/hand-history/hand-history.analytics.ts"
Task: "T020 [US1] Typed API client in frontend/src/services/handAnalyticsApi.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 Setup.
2. Complete Phase 2 Foundational authorization, validation, and calculation primitives.
3. Complete Phase 3 User Story 1 for summary, trend, empty state, and privacy-safe errors.
4. Stop and validate the personal dashboard independently with focused backend/frontend suites.
5. Demo the summary and real-versus-EV trend before adding breakdowns and drill-down.

### Incremental Delivery

1. Setup + Foundational -> authorized analytics response boundary.
2. User Story 1 -> personal summary and trends (MVP).
3. User Story 2 -> VPIP/PFR/3-bet/win rate and breakdowns.
4. User Story 3 -> synchronized date and modality filters.
5. User Story 4 -> related hands and detail/replay navigation.
6. Polish -> performance, accessibility, privacy hardening, documentation, and regression.

### Parallel Team Strategy

1. Complete Setup + Foundational together.
2. After the shared response boundary:
   - Developer A: User Story 1 summary and trend.
   - Developer B: User Story 2 metrics and breakdowns.
   - Developer C: User Story 3 filters and URL state.
3. Implement User Story 4 after the filtered document shape stabilizes.
4. Run cross-cutting validation only after all selected stories pass their checkpoints.

---

## Notes

- Every task uses the required `- [ ] T### [P?] [US#?] description` checklist format.
- `[P]` appears only where the work can use different files without waiting on incomplete work.
- Story labels are present on every user-story task and absent from setup, foundational, and polish tasks.
- No database migration is planned for the MVP; analytics is derived from authorized historical snapshots and actions.
- Do not infer gains or EV from pot/result fields when the public analytics input is absent; return `DATA_UNAVAILABLE`.
- Do not add recommendations, rankings, cross-user comparisons, or changes to poker rules in this feature.
