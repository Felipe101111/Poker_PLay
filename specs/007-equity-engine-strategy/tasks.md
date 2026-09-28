---

description: "Implementation task list for Equity Engine and Versioned Strategy"
---

# Tasks: Equity Engine y estrategia versionada

**Input**: Design documents from `/specs/007-equity-engine-strategy/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/equity-strategy-contracts.md](contracts/equity-strategy-contracts.md), [quickstart.md](quickstart.md)

**Tests**: Required. Equity, range, strategy, authorization, persistence, and Trainer integration are critical domain behavior and must be covered before implementation tasks are marked complete.

**Organization**: Tasks are grouped by user story. US1, US2, and US3 provide independently testable domain capabilities; US4 integrates them into Trainer evaluation.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish independent equity and strategy module boundaries and shared test fixtures.

- [X] T001 Create the Equity Engine module files `backend/src/modules/equity/equity.types.ts`, `equity.validation.ts`, `equity.engine.ts`, and `equity.projection.ts` per `plan.md`.
- [X] T002 [P] Create the Strategy Engine module files `backend/src/modules/strategy/strategy.types.ts`, `strategy.validation.ts`, `strategy.repository.ts`, and `strategy.service.ts` per `plan.md`.
- [X] T003 [P] Create unit-test fixture helpers for canonical cards, boards, holdings, weighted combos, deterministic runouts, and strategy contexts in `backend/tests/helpers/equity-strategy.ts`.
- [X] T004 [P] Create the initial versioned strategy dataset manifest and source-data directory under `backend/src/modules/strategy/data/` with documented provenance and assumptions.
- [X] T005 [P] Add module test directories and baseline test files under `backend/tests/unit/equity/`, `backend/tests/unit/strategy/`, and `backend/tests/integration/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish domain invariants, persistence boundaries, errors, and shared contracts before story implementation.

**CRITICAL**: No user-story implementation begins until this phase is complete.

- [X] T006 Add explicit domain types for `Card`, `Combo`, `Range`, `BoardState`, `EquityCalculation`, `StrategyDatasetVersion`, `StrategyRow`, `EvaluationContext`, and `EvaluationSnapshot` in `backend/src/modules/equity/equity.types.ts` and `backend/src/modules/strategy/strategy.types.ts`, preserving the constraints from `data-model.md`.
- [X] T007 [P] Add Zod validation for unique cards, street/card counts, combo canonical ordering, finite weights in `[0, 1]`, non-empty calculation ranges, strategy contexts, and exact calculation configuration in `backend/src/modules/equity/equity.validation.ts` and `backend/src/modules/strategy/strategy.validation.ts`.
- [X] T008 [P] Add stable error codes and HTTP/domain mappings for `INVALID_CARD_STATE`, `INVALID_RANGE`, `EMPTY_RANGE`, `UNSUPPORTED_CALCULATION_METHOD`, `STRATEGY_VERSION_NOT_FOUND`, `NO_COMPATIBLE_STRATEGY_ROW`, and `EVALUATION_CONTEXT_INVALID` in `backend/src/shared/errors.ts`.
- [X] T009 Add Prisma entities and relations for immutable strategy dataset metadata, strategy rows, and evaluation snapshots in `backend/src/db/prisma/schema.prisma`, including publication status, version identity, context snapshots, strategy snapshots, and indexes described in `data-model.md`.
- [X] T010 Create the versioned migration `backend/src/db/prisma/migrations/20260928000400_add_equity_strategy/migration.sql` with foreign keys, uniqueness constraints, JSON snapshot columns, immutable-version support, and indexes for strategy lookups and historical evaluations.
- [X] T011 [P] Add shared normalized-input fingerprinting and decimal/precision helpers in `backend/src/modules/equity/equity.fingerprint.ts` and `backend/src/modules/equity/equity.precision.ts`.
- [X] T012 [P] Add pure contract type tests for the Equity Engine and Strategy Engine shapes in `backend/tests/unit/equity/equity-contracts.test.ts` and `backend/tests/unit/strategy/strategy-contracts.test.ts`.

**Checkpoint**: Domain types, validation, persistence shape, error vocabulary, and deterministic calculation metadata are ready for user stories.

---

## Phase 3: User Story 1 - Calcular equity de manos y rangos (Priority: P1) 🎯 MVP

**Goal**: Calculate exact, reproducible equity for valid hand and range inputs with explicit ties, precision, blockers, and invalid-input errors.

**Independent Test**: Submit deterministic hand-versus-hand, hand-versus-range, and range-versus-range requests; verify probability bounds, split results, reproducibility, and rejection of impossible card states.

### Tests for User Story 1

- [X] T013 [P] [US1] Add exact hand-versus-hand unit tests for known winners, ties, split equity, probability bounds, and `runoutsEvaluated` in `backend/tests/unit/equity/equity-engine.test.ts`.
- [X] T014 [P] [US1] Add hand-versus-range and range-versus-range unit tests for weighted aggregation, blocker removal, empty active ranges, and stable input fingerprints in `backend/tests/unit/equity/equity-ranges.test.ts`.
- [X] T015 [P] [US1] Add invalid-input tests for duplicate cards, impossible boards, wrong street card counts, unsupported methods, non-finite weights, and out-of-range precision in `backend/tests/unit/equity/equity-validation.test.ts`.
- [X] T016 [US1] Add deterministic integration tests proving repeated calculations with the same normalized request return identical equity, tie probability, method, precision, and fingerprint in `backend/tests/integration/equity-determinism.test.ts`.

### Implementation for User Story 1

- [X] T017 [US1] Implement canonical card, combo, board, and participant normalization in `backend/src/modules/equity/equity.engine.ts` using the existing Poker Engine card types without accepting raw `HandState` internals.
- [X] T018 [US1] Implement exact legal-runout enumeration and hand comparison in `backend/src/modules/equity/equity.engine.ts`, returning win probability, tie probability, equity share, runout count, blockers, and declared precision.
- [X] T019 [US1] Implement weighted range aggregation and blocker filtering in `backend/src/modules/equity/equity.engine.ts`, preserving original weights and reporting remaining weight without silent redistribution.
- [X] T020 [US1] Implement normalized-input fingerprinting and precision checks in `backend/src/modules/equity/equity.fingerprint.ts` and `backend/src/modules/equity/equity.precision.ts`.
- [X] T021 [US1] Implement safe result projection in `backend/src/modules/equity/equity.projection.ts` so results contain calculation metadata but never engine deck or unauthorized private state.

**Checkpoint**: US1 independently calculates and validates exact equity without strategy or Trainer dependencies.

---

## Phase 4: User Story 2 - Representar y validar rangos (Priority: P1)

**Goal**: Provide one canonical weighted-combo representation for range expansion, normalization, blocker filtering, and future streets.

**Independent Test**: Build ranges from concrete combos and supported hand notation, apply blockers, normalize explicitly, and verify invalid or empty ranges are reported without changing weights silently.

### Tests for User Story 2

- [X] T022 [P] [US2] Add range construction tests for canonical card ordering, pair/suited/offsuit combo expansion, duplicate combo rejection, and source notation validation in `backend/tests/unit/equity/range-expansion.test.ts`.
- [X] T023 [P] [US2] Add blocker tests for board and known-hole-card removal, remaining combo counts, remaining total weight, and all-combos-blocked behavior in `backend/tests/unit/equity/range-blockers.test.ts`.
- [X] T024 [P] [US2] Add normalization tests for proportional weights, explicit normalization factors, zero weights, negative weights, NaN/infinite values, and weights above 1 in `backend/tests/unit/equity/range-normalization.test.ts`.

### Implementation for User Story 2

- [X] T025 [US2] Implement range source parsing and concrete combo expansion in `backend/src/modules/equity/range.parser.ts`, supporting the documented Hold'em hand classes and rejecting ambiguous notation.
- [X] T026 [US2] Implement canonical combo creation, ordering, duplicate detection, and finite `[0, 1]` weight validation in `backend/src/modules/equity/range.combos.ts`.
- [X] T027 [US2] Implement explicit normalization and blocker filtering in `backend/src/modules/equity/range.service.ts`, returning normalization metadata, removed-combo count, and remaining weight.
- [X] T028 [US2] Integrate the shared `Range` contract with `backend/src/modules/equity/equity.engine.ts` without duplicating blocker or weighting rules.

**Checkpoint**: US2 independently produces valid weighted ranges that US1 can consume and that future postflop streets can reuse.

---

## Phase 5: User Story 3 - Publicar datos estratégicos versionados (Priority: P1)

**Goal**: Publish, resolve, retire, and historically snapshot strategy data without mutable recommendations or fabricated advice.

**Independent Test**: Publish two versions for one context, resolve each independently, request a missing row, and verify historical snapshots retain the original version and assumptions.

### Tests for User Story 3

- [X] T029 [P] [US3] Add strategy dataset validation tests for manifest fields, game parameters, assumptions, action frequencies, row context keys, and immutable publication rules in `backend/tests/unit/strategy/strategy-validation.test.ts`.
- [X] T030 [P] [US3] Add strategy lookup tests for version isolation, compatible rows, missing rows as `UNAVAILABLE`, retired-version reads, and no fabricated recommendations in `backend/tests/unit/strategy/strategy-lookup.test.ts`.
- [X] T031 [P] [US3] Add persistence integration tests for publishing a version, preventing mutation after publication, and preserving strategy/evaluation snapshots in `backend/tests/integration/strategy-versioning.test.ts`.

### Implementation for User Story 3

- [X] T032 [US3] Implement strategy manifest and row loading from `backend/src/modules/strategy/data/` in `backend/src/modules/strategy/strategy.service.ts`, including provenance, assumptions, schema version, and content integrity metadata.
- [X] T033 [US3] Implement immutable dataset publication, retirement, version lookup, and compatible row resolution in `backend/src/modules/strategy/strategy.repository.ts` and `backend/src/modules/strategy/strategy.service.ts`.
- [X] T034 [US3] Implement `AVAILABLE` and `UNAVAILABLE` strategy result projections in `backend/src/modules/strategy/strategy.service.ts`, preserving mixed action frequencies and assumptions.
- [X] T035 [US3] Implement historical evaluation snapshot persistence in `backend/src/modules/strategy/strategy.repository.ts`, storing context, dataset metadata, resolved row, and calculation references append-only.
- [X] T036 [US3] Add authenticated read contracts for strategy metadata and version resolution in `backend/src/modules/strategy/strategy.routes.ts` only if the existing Trainer integration requires transport access; otherwise expose the service contract internally and document the decision in `backend/src/modules/strategy/README.md`.

**Checkpoint**: US3 independently provides auditable, immutable strategy data and explicit unavailable behavior.

---

## Phase 6: User Story 4 - Integrar equity y estrategia en evaluaciones explicables (Priority: P2)

**Goal**: Combine independent equity and strategy results in Trainer evaluations while preserving authorization, historical reproducibility, and educational explanations.

**Independent Test**: Evaluate a valid Trainer scenario with both engines, with strategy missing, and with invalid equity inputs; verify each result separates quantitative data, strategy frequencies, classification, assumptions, and limitations.

### Tests for User Story 4

- [X] T037 [P] [US4] Add Trainer integration tests for available equity plus available strategy, asserting separate equity, strategy version, frequencies, classification, factors, and assumptions in `backend/tests/integration/trainer-equity-strategy.test.ts`.
- [X] T038 [P] [US4] Add unavailable and invalid-input integration tests proving equity may remain visible when strategy is missing, invalid calculations do not create recommendations, and `UNAVAILABLE` is preserved in `backend/tests/contract/trainer-equity-strategy.test.ts`.
- [X] T039 [P] [US4] Add regression tests for Feature 006 projection, private-card redaction, user ownership, idempotent decisions, and unchanged preflop behavior in `backend/tests/contract/trainer-equity-regression.test.ts`.
- [X] T040 [P] [US4] Add frontend result rendering tests for separate equity/strategy sections, version and assumptions, unavailable strategy, and calculation limitations in `frontend/tests/trainer-equity.test.tsx`.

### Implementation for User Story 4

- [X] T041 [US4] Add the server-derived evaluation context adapter from Feature 006 scenarios in `backend/src/modules/trainer/trainer.evaluation-context.ts`, excluding raw deck, opponent private cards, and mutable client fields.
- [X] T042 [US4] Implement Trainer orchestration in `backend/src/modules/trainer/trainer.service.ts` or a dedicated `backend/src/modules/trainer/trainer.evaluation.ts`, calling Equity Engine and Strategy Engine independently and combining only their public domain results.
- [X] T043 [US4] Extend immutable decision/evaluation persistence in `backend/src/modules/trainer/trainer.repository.ts` and `backend/src/db/prisma/schema.prisma` with equity metadata, strategy snapshots, availability, and calculation fingerprints.
- [X] T044 [US4] Extend Trainer response projection in `backend/src/modules/trainer/trainer.projection.ts` and `backend/src/modules/trainer/trainer.types.ts` to expose equity, strategy version, frequencies, assumptions, limitations, and classification without internal snapshots.
- [X] T045 [US4] Update `frontend/src/services/trainerApi.ts` and `frontend/src/pages/TrainerPage.tsx` to render separate quantitative and strategic feedback, including explicit unavailable and invalid-calculation states.
- [X] T046 [US4] Add authenticated route integration only for the public Trainer/equity contract required by the final design in `backend/src/modules/trainer/trainer.routes.ts` and `backend/src/modules/equity/equity.routes.ts`; keep pure engine operations internal when no public endpoint is needed.

**Checkpoint**: US4 integrates 007 into Trainer while preserving Feature 006 security, redaction, idempotency, and historical behavior.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate performance, security, documentation, and compatibility across the feature.

- [X] T047 [P] Add security tests for forged dataset versions, unauthorized evaluation snapshots, private-card/deck leakage, and client-supplied strategy overrides in `backend/tests/contract/equity-strategy-security.test.ts`.
- [X] T048 [P] Add performance benchmark for representative exact hand/range and range/range calculations, reporting p50/p95, runout counts, and memory observations in `backend/tests/performance/equity-performance.test.ts`.
- [X] T049 [P] Update `backend/README.md` and `README.md` with Equity Engine boundaries, strategy versioning, unavailable behavior, and links to `specs/007-equity-engine-strategy/quickstart.md`.
- [X] T050 Run the complete validation sequence from `specs/007-equity-engine-strategy/quickstart.md`, including Prisma validation/migration, backend/frontend tests and builds, security scenarios, historical snapshot checks, and the p95 performance target.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No feature dependency; creates module boundaries and fixtures.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational; MVP exact equity is independently testable.
- **US2 (Phase 4)**: Depends on Foundational and can proceed in parallel with US1; US1 consumes its final Range contract before range-based equity integration.
- **US3 (Phase 5)**: Depends on Foundational and can proceed in parallel with US1/US2; it does not calculate equity.
- **US4 (Phase 6)**: Depends on US1, US2, and US3 because it combines their outputs and extends Trainer snapshots.
- **Polish (Phase 7)**: Depends on all desired stories and the final integration contract.

### User Story Dependencies

- **US1 (P1)**: Foundational only for hand-versus-hand MVP; range-based cases consume the shared Range contract from US2.
- **US2 (P1)**: Foundational only; independently delivers canonical ranges and blocker behavior.
- **US3 (P1)**: Foundational only; independently delivers versioned strategy lookup and immutable snapshots.
- **US4 (P2)**: Requires completed Equity Engine, Range contract, and Strategy Engine; preserves Feature 006 as a regression boundary.

### Parallel Opportunities

- T002-T005 can run in parallel during Setup.
- T007, T008, T011, and T012 can run in parallel after shared domain names are agreed.
- T013-T016 can run in parallel before US1 implementation.
- T022-T024 can run in parallel before US2 implementation.
- T029-T031 can run in parallel before US3 implementation.
- T037-T040 can run in parallel before US4 implementation.
- T047-T049 can run in parallel after the integration contract stabilizes.
- US1, US2, and US3 can be developed in parallel after Foundational completion if shared type changes are coordinated.

### Parallel Example: User Story 1

```text
Task: T013 Add exact hand-versus-hand tests in backend/tests/unit/equity/equity-engine.test.ts
Task: T014 Add weighted range equity tests in backend/tests/unit/equity/equity-ranges.test.ts
Task: T015 Add validation tests in backend/tests/unit/equity/equity-validation.test.ts
Task: T016 Add reproducibility integration tests in backend/tests/integration/equity-determinism.test.ts
```

### Parallel Example: User Story 3

```text
Task: T029 Add dataset validation tests in backend/tests/unit/strategy/strategy-validation.test.ts
Task: T030 Add lookup/unavailable tests in backend/tests/unit/strategy/strategy-lookup.test.ts
Task: T031 Add persistence/version isolation tests in backend/tests/integration/strategy-versioning.test.ts
```

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Setup and Foundational phases.
2. Complete US1 hand-versus-hand exact equity and validation.
3. Add the minimum range contract needed for deterministic hand-versus-range coverage.
4. Run US1 unit/integration tests and the performance sample.
5. Stop for a usable, independent Equity Engine milestone before strategy integration.

### Incremental Delivery

1. Add US2 weighted ranges and blockers; validate combo invariants.
2. Add US3 versioned strategy publication, lookup, unavailable behavior, and snapshots.
3. Add US4 Trainer integration and frontend explanations.
4. Complete security, regression, documentation, and performance validation.
5. Generate implementation tasks only after this plan remains aligned with the spec and contracts.

## Notes

- Every task has a sequential ID, a checkbox, an exact repository path, and a story label where required.
- `[P]` marks tasks that can be worked on independently without incomplete-file dependencies.
- No task introduces postflop Trainer flows, tournaments, real-money behavior, or external solver integration; those remain future roadmap features.
