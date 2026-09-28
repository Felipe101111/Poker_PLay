# Implementation Plan: Poker Trainer postflop completo

**Branch**: `008-poker-trainer-postflop` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-poker-trainer-postflop/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Extend the authenticated Poker Trainer from preflop-only sessions to one server-authoritative postflop sequence covering flop, turn, and river. Reuse the Poker Engine for valid street transitions and legal actions, reuse Feature 007 for exact equity, blockers, versioned strategy, and immutable evaluation snapshots, and expose only the authorized projected state. Persist each street as an ordered immutable scenario/decision while preventing continuation after terminal hand states.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript on Node.js 20+; frontend TypeScript/React 18.

**Primary Dependencies**: Express, Prisma 5, PostgreSQL, Zod, Vitest, Supertest, React Testing Library, Vite, and the existing Poker Engine, Equity Engine, and Strategy Engine modules.

**Storage**: PostgreSQL through Prisma; JSON snapshots remain append-only for engine context, equity, strategy rows, and explanations.

**Testing**: Vitest unit/integration/contract/performance tests, Supertest HTTP contracts, React Testing Library UI tests, Prisma validation/migration deployment, TypeScript builds, and ESLint where applicable.

**Target Platform**: Authenticated web application with Node.js backend, PostgreSQL persistence, and browser frontend.

**Project Type**: Full-stack web application with a server-authoritative poker domain and authenticated Trainer workflow.

**Performance Goals**: At least 95% of representative postflop evaluations complete in under 2 seconds; capture p50/p95 and runout counts for flop, turn, and river calculations.

**Constraints**: Exact equity remains explicitly declared; no silent approximation. The server owns cards, board, ranges, strategy, legal actions, and results. No raw deck, future board, opponent private cards, or client-supplied strategy may cross the projection boundary. Existing preflop behavior and idempotency must remain compatible.

**Scale/Scope**: One six-player, 100 BB virtual-chip Trainer sequence per active user, with ordered flop/turn/river scenarios and decisions. Tournaments, live multiplayer, general hand history, advanced statistics, real money, and full strategy administration remain outside this feature.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The design passes the constitutional gates:

- **Server authority and privacy**: the client submits only an action intent, scenario id, and idempotency key; all cards, board, legal actions, ranges, equity, strategy, and transitions are server-derived.
- **Clear boundaries**: Trainer orchestration remains separate from Poker Engine rules, Equity Engine calculations, Strategy Engine lookup, persistence, and frontend projection.
- **Determinism and valid transitions**: scenarios use seeded engine snapshots and existing engine transitions; impossible cards, actions, duplicate decisions, and terminal continuation are rejected.
- **Equity/strategy separation**: quantitative equity, blockers, strategy frequencies, explanations, and unavailable states remain distinct in the contract and snapshot.
- **Historical integrity**: decisions and evaluation snapshots are append-only and retain the strategy version, assumptions, calculation metadata, and fingerprint used at evaluation time.
- **Testing and incremental delivery**: unit, contract, integration, security, UI, performance, migration, and regression checks are planned before implementation completion.
- **No gate violations**: no complexity exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
backend/
├── src/
│   ├── db/prisma/
│   ├── modules/trainer/
│   ├── modules/equity/
│   ├── modules/strategy/
│   ├── poker-engine/
│   └── shared/
└── tests/
  ├── contract/
  ├── integration/
  ├── performance/
  └── unit/

frontend/
├── src/
│   ├── pages/
│   ├── services/
│   └── components/
└── tests/
```

**Structure Decision**: Use the existing two-root web application. Add postflop generation, evaluation context, orchestration, projections, and repository/migration changes inside `backend/src/modules/trainer/`; reuse `backend/src/modules/equity/`, `backend/src/modules/strategy/`, and `backend/src/poker-engine/`. Add focused backend tests under the existing test categories and extend the Trainer page/API service tests under `frontend/tests/`.

## Phase 0: Research Consolidation

Research is complete in [research.md](research.md). The resolved decisions are:

1. Reuse the existing Poker Engine for board dealing, street transitions, action legality, all-in, fold, and terminal resolution.
2. Represent flop, turn, and river as one ordered postflop training sequence.
3. Keep all sensitive and derived state server-authoritative.
4. Resolve versioned postflop strategy by complete context and return `UNAVAILABLE` when no compatible row exists.
5. Persist immutable evaluation snapshots with equity and strategy metadata.
6. Represent terminal hand states explicitly rather than fabricating later streets.

## Phase 1: Design Outputs

The design artifacts are complete:

- [data-model.md](data-model.md) defines postflop sessions, scenarios, decisions, snapshots, invariants, and street transitions.
- [contracts/trainer-postflop-http.md](contracts/trainer-postflop-http.md) defines authenticated start/resume, decision, continuation, projection, and error behavior.
- [quickstart.md](quickstart.md) defines Prisma, backend, frontend, security, idempotency, terminal-state, and performance validation.

## Implementation Phases

### Phase A: Domain and persistence foundation

- Extend Trainer format/street types and validation to support a postflop sequence without weakening preflop contracts.
- Add the required Prisma enum/fields and migration for postflop session/scenario metadata, including street, board, pot, and terminal state where not safely represented in existing JSON snapshots.
- Add repository helpers for ordered scenario lookup, street continuation, terminal completion, and append-only evaluation snapshot persistence.

### Phase B: Deterministic postflop generation

- Add a seeded scenario generator that produces a valid preflop history and advances the engine to a decision-ready flop state.
- Add continuation generation that derives turn and river states from the persisted engine snapshot and the accepted prior action.
- Ensure fold, all-in, showdown, and complete states stop the sequence and expose a terminal result instead of a fabricated scenario.

### Phase C: Evaluation and API boundary

- Extend the server-derived evaluation context with street, board, pot, prior actions, ranges, blockers, and strategy context.
- Resolve postflop strategy rows by version and context; combine with exact equity without merging their responsibilities.
- Persist decision and evaluation snapshots atomically/idempotently, including fingerprint, limitations, unavailable status, and immutable strategy data.
- Add authenticated postflop routes or extend the existing Trainer routes according to the contract while preserving authorization and redaction.

### Phase D: Projection and frontend flow

- Project street, board, pot, legal actions, terminal state, equity, strategy, frequencies, assumptions, and limitations without internal snapshots.
- Render one continuous flop/turn/river practice flow with separate quantitative and strategic feedback, refresh recovery, terminal result, loading, error, and unavailable states.
- Keep controls keyboard-operable and prevent optimistic state changes before server acknowledgment.

### Phase E: Validation and hardening

- Add unit tests for generation, street transitions, terminal states, validation, context derivation, strategy availability, and projection.
- Add contract/integration tests for ownership, idempotency, concurrent requests, historical snapshots, and complete flop-turn-river sequences.
- Add security tests for forged board/ranges/strategy, private-card leakage, future-card leakage, and cross-user access.
- Add performance coverage for representative exact postflop calculations and run the complete quickstart/build validation.

## Complexity Tracking

No constitutional violations or additional project boundaries are introduced. The feature extends the existing Trainer and reuses the current Poker Engine, Equity Engine, Strategy Engine, persistence, and frontend roots.
