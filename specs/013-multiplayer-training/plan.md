# Implementation Plan: Entrenamiento multijugador

**Branch**: `013-multiplayer-training` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/013-multiplayer-training/spec.md`

## Summary

Extend the existing server-authoritative multiplayer table with an opt-in training overlay. A training session is linked one-to-one to a `MultiplayerTable`; enrolled participants receive private, immutable feedback for their own accepted actions. The table and Poker Engine remain the sole authority for cards, turns, actions, stacks, pots, results, reconnection, and terminal state. Decisions capture a privacy-safe context at action time, evaluate against the existing equity and published strategy boundaries, and publish terminal hands through the existing Hand History pipeline.

## Technical Context

**Language/Version**: TypeScript 5.5 on Node.js 20+; frontend TypeScript/React 18.

**Primary Dependencies**: Existing Express 4, Prisma 5, PostgreSQL 16, Zod, express-session, Socket.IO 4, Vitest, Supertest, React Testing Library, Vite, Poker Engine, Equity Engine, Strategy Engine, and Hand History modules.

**Storage**: PostgreSQL through Prisma. Existing multiplayer table/hand/action rows remain authoritative; new training-session, participant, and decision rows are append-oriented and linked to those records. Evaluation snapshots and terminal histories remain immutable.

**Testing**: Vitest unit/contract/integration/security/performance tests, Supertest HTTP contracts, Socket.IO integration tests, Prisma migration deployment, TypeScript builds, ESLint, and focused React Testing Library tests.

**Target Platform**: Authenticated Node.js backend with PostgreSQL and React 18/Vite browser client.

**Project Type**: Full-stack web application with server-authoritative real-time poker and private training feedback.

**Performance Goals**: At least 95% of normal table state updates reach authorized connected clients within 1 second; at least 95% of reconnects recover authorized table and private training state within 5 seconds; accepted actions create at most one decision.

**Constraints**: Virtual chips only; one active hand per table; 2-6 training participants initially; no client authority over game or evaluation fields; no leakage of opponent cards, raw deck, private feedback, or internal snapshots; preserve individual Trainer and Feature 005 contracts; no second poker engine.

**Scale/Scope**: One training overlay per started table, up to 6 enrolled participants per table, thousands of stored training decisions and terminal histories, and load validation for 1,000 concurrent participants distributed across sessions.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / gate | Plan evidence | Status |
|---|---|---|
| P1/P3/P18 — server-authoritative rules and untrusted clients | Existing `multiplayerService.act()` and Poker Engine remain the only path for accepted actions; training captures only accepted server-normalized actions. | PASS |
| P4/P23 — private information and explicit authorization | Table projections remain per-user; training decisions and feedback are filtered by authenticated participant; no client-supplied identity or evaluation fields are trusted. | PASS |
| P6/P7/P8 — clear boundaries and reusable engines | New training orchestration stores metadata and feedback but does not move rules, equity, strategy, transport, or presentation logic into the wrong module. | PASS |
| P11-P15 — equity/strategy separation and educational feedback | Decision context, equity snapshot, strategy snapshot, availability, and explanation remain distinct; missing strategy returns `UNAVAILABLE`. | PASS |
| P19/P20 — consistent realtime state and reconnection | Existing state versions, transaction locking, post-commit broadcasts, reconnect snapshots, and presence policy are preserved and tested before training integration. | PASS |
| P24/P25 — atomicity and reproducibility | Table action, training decision, and evaluation snapshot are committed atomically; terminal history publication is idempotent; snapshots are immutable. | PASS |
| P26/P27 — critical logic and edge-case tests | Tests cover privacy, forged fields, concurrent actions, stale versions, retries, disconnects, terminal states, unavailable strategy, and cross-user access. | PASS |
| P28/P29 — incremental scope and no premature complexity | The feature adds one training overlay and does not add tournaments, matchmaking, chat, real money, or a parallel game engine. | PASS |
| P31/P32 — documentation and specification fidelity | Research, model, HTTP/realtime contracts, quickstart, and this plan record the behavior and boundaries before implementation. | PASS |

All pre-design gates pass. No constitutional exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/013-multiplayer-training/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── db/prisma/schema.prisma
│   ├── db/prisma/migrations/
│   ├── poker-engine/
│   └── modules/
│       ├── multiplayer/
│       │   ├── multiplayer.training.types.ts
│       │   ├── multiplayer.training.validation.ts
│       │   ├── multiplayer.training.repository.ts
│       │   ├── multiplayer.training.service.ts
│       │   ├── multiplayer.training.routes.ts
│       │   ├── multiplayer.training.socket.ts
│       │   └── multiplayer.training.projection.ts
│       ├── trainer/
│       ├── equity/
│       ├── strategy/
│       └── hand-history/
└── tests/
  ├── contract/
  ├── integration/
  ├── security/
  ├── performance/
  └── unit/

frontend/
├── src/
│   ├── pages/MultiplayerTrainingPage.tsx
│   ├── services/multiplayerTrainingApi.ts
│   ├── services/multiplayerSocket.ts
│   └── App.tsx
└── tests/
  └── multiplayer-training.test.tsx
```

**Structure Decision**: Keep the existing backend/frontend roots. Extend the current multiplayer boundary with focused training orchestration, repositories, projections, routes, and socket events. Reuse the pure Poker Engine, existing equity/strategy services, Hand History publisher, session authentication, and table socket instead of creating parallel domain state or a new application.

## Phase 0: Research Summary

Research is complete in [research.md](research.md). The resolved decisions are:

1. Use a dedicated multiplayer training session because the existing `TrainingSession` is single-user and scenario-oriented.
2. Keep `MultiplayerTable`, `MultiplayerHand`, `TableAction`, and the Poker Engine authoritative for all gameplay transitions.
3. Capture a decision only for an accepted action, atomically with the table transition, using `tableActionId` as the idempotency boundary.
4. Separate the player's visible decision context from server-derived equity and strategy snapshots.
5. Return explicit `UNAVAILABLE` feedback when no compatible published strategy or required calculation is available.
6. Publish terminal hands through existing Hand History once, without exposing private training feedback to table/replay/analytics projections.
7. Harden inherited multiplayer version, deduplication, reconnection, and terminal-link invariants before depending on them.

No unresolved `NEEDS CLARIFICATION` items remain.

## Phase 1: Design Summary

### Persistence and transaction flow

1. Create one `MultiplayerTrainingSession` for an existing table and enroll room members through `MultiplayerTrainingParticipant`.
2. On an accepted table action, lock and validate the current table/hand as Feature 005 already does; capture a privacy-safe pre-action context and create one `MultiplayerTrainingDecision` in the same transaction.
3. Derive equity and strategy feedback from server-owned context, persist immutable evaluation snapshots, and emit feedback only to the acting participant after commit.
4. On terminal hand completion, mark training terminal, publish a `MULTIPLAYER` hand-history snapshot idempotently, and notify enrolled participants without adding private feedback to public projections.

### Security and privacy

- Session identity resolves user, seat, table membership, and training participant; client payloads cannot set those values or any evaluation result.
- `decisionContextSnapshot` contains only information visible to the acting player at decision time. It never stores opponent hole cards, the raw deck, or internal engine state.
- HTTP and socket training responses are filtered by the authenticated participant before serialization.
- Table state broadcasts remain shared only for authorized public/private-card projections; feedback events are participant-specific.

### Recovery and idempotency

- Existing table state versions remain the stale-request boundary; training decision ids and table versions are not conflated.
- Retries resolve through the existing action request key and the decision's unique table-action relation.
- Reconnection restores the current table projection first and then fetches private training decisions, so missed feedback events are recoverable.
- Leaving training stops future capture without folding or removing the player from the poker table.

### Frontend behavior

- Add a training enrollment/feedback view around the existing multiplayer table rather than duplicating table controls.
- Render public table state and private own feedback separately; never render another participant's evaluation.
- Treat server acknowledgements and versions as authoritative; stale events do not overwrite newer table state.
- Show explicit unavailable feedback and recoverable connection/error states.

## Implementation Phases

### Phase A: Invariant hardening and persistence

- Verify and fix action idempotency scope, table/hand state-version alignment, eliminated-participant reconnect behavior, and terminal `currentHandId` cleanup in the existing multiplayer path.
- Extend the Prisma schema and migration with training session/participant/decision relations and the optional evaluation-snapshot relation/source metadata.
- Add typed training validation, repository operations, unique constraints, and transaction helpers.

### Phase B: Enrollment and private training boundary

- Add authenticated create-or-join, current training view, decision listing, and leave flows.
- Resolve enrollment from authenticated room membership and expose only the caller's training participant and decisions.
- Add socket join/leave events and private error/feedback event types without changing shared table event semantics.

### Phase C: Atomic decision capture and evaluation

- Extend the accepted-action transaction to capture a privacy-safe decision context only after the Poker Engine accepts the action.
- Evaluate against existing equity and published strategy services; persist available or unavailable immutable snapshots.
- Add duplicate, concurrent, stale-state, forged-field, and strategy-retirement handling.

### Phase D: Terminal publication and recovery

- Mark training complete on terminal table state and publish Hand History exactly once.
- Preserve access policies for history/replay/analytics and keep private feedback outside public projections.
- Add reconnect recovery for table state and private training decision history, including timeout, abandonment, elimination, and closed-table behavior.

### Phase E: Frontend and validation

- Build the training enrollment and private feedback UI around the existing multiplayer table.
- Add backend contract/integration/security/performance tests and frontend interaction/accessibility coverage.
- Run migration, focused tests, full regression, builds, lint, and the Feature 013 quickstart scenarios.

## Constitution Re-check After Phase 1 Design

| Gate | Post-design evidence | Status |
|---|---|---|
| Server authority and private information | Only the existing table/Poker Engine transition changes gameplay; decision contexts and feedback are projected per participant. | PASS |
| Domain boundaries and engine reuse | Training records are an overlay; gameplay, equity, strategy, history, transport, and UI remain separate responsibilities. | PASS |
| Equity/strategy separation and historical integrity | Decision context, equity, strategy, availability, and explanation are distinct immutable snapshots. | PASS |
| Atomicity and idempotency | Accepted action, decision capture, and evaluation snapshot share the action transaction; terminal publication uses existing source uniqueness. | PASS |
| Realtime consistency and recovery | Table versions remain authoritative; private feedback is replayable through HTTP after reconnect. | PASS |
| Testing and edge cases | The quickstart and phases cover forged inputs, privacy, concurrency, stale state, retries, timeout, abandonment, unavailable strategy, and terminal publication. | PASS |
| Scope and complexity | No real money, tournament, matchmaking, chat, new rules, or parallel engine is introduced. | PASS |

All post-design gates pass. No complexity exception is required.

## Complexity Tracking

No constitutional violations or unnecessary additional projects were identified. The dedicated multiplayer training entities are required to preserve the existing single-user Trainer invariants and to isolate private feedback.
