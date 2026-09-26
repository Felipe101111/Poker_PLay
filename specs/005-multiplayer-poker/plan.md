# Implementation Plan: Multiplayer Poker Tables

**Branch**: `005-multiplayer-poker` | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-multiplayer-poker/spec.md`

## Summary

Feature 005 turns a started feature-004 room into a live, server-authoritative multiplayer poker table. It reuses the pure Poker Engine for all game rules, persists the active table and hand state in PostgreSQL for recovery and process safety, serializes concurrent actions through transactional database coordination, and delivers per-user state projections through HTTP recovery endpoints and Socket.IO events. A server-owned presence timeout automatically folds disconnected acting players after 60 seconds; completed hands eliminate zero-stack players and close the table when fewer than two eligible players remain.

## Technical Context

**Language/Version**: TypeScript 5.5 on Node.js 20+

**Primary Dependencies**: Existing Express 4, Prisma 5, PostgreSQL 16, Zod, express-session; add Socket.IO 4 for authenticated live connections and socket.io-client for frontend integration tests/client use

**Storage**: PostgreSQL is authoritative for tables, participants, hand snapshots, accepted actions, versions, presence timestamps, and completed results. Socket connections are ephemeral delivery state only.

**Testing**: Vitest, Supertest, existing Poker Engine unit tests, Prisma-backed integration/contract tests, and Socket.IO client/server integration tests

**Target Platform**: Node.js backend and React 18/Vite browser client on the existing local and deployed web application platforms

**Project Type**: Full-stack web application with an Express/Prisma backend and React frontend

**Performance Goals**: At least 95% of accepted actions reflected for connected members within 1 second under expected feature load; reconnecting members recover an authorized state within 5 seconds; action writes remain serialized without duplicate transitions

**Constraints**: Server is the sole game authority; private cards must be projected per authenticated user; one table per started room and one active hand at a time; no real-money balances, tournaments, multi-table play, blind-level progression, or long-term hand-history analytics

**Scale/Scope**: Started rooms with 2-9 fixed seats, one active hand per table, thousands of waiting/started room records, and multiple backend processes sharing PostgreSQL as the coordination boundary

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / gate | Plan evidence | Status |
|---|---|---|
| P1/P3/P18 — server-authoritative rules and untrusted clients | All actions are revalidated through the existing Poker Engine; user and seat identity come from the authenticated session and persisted membership. | PASS |
| P4/P23 — private information and explicit authorization | HTTP and live events return per-user projections; unauthorized room/table access and private-card reads are rejected or redacted. | PASS |
| P6/P7 — clear boundaries and reusable engine | Real-time transport, persistence, and presentation wrap the existing `backend/src/poker-engine/` without moving rules into sockets or UI. | PASS |
| P19/P20 — consistent state and reconnection | Versioned snapshots, post-commit broadcasts, full reconnect recovery, and server-owned disconnect grace handling are specified. | PASS |
| P9/P10/P26/P27 — deterministic rules and edge-case tests | Persisted actions call the tested engine; contracts and quickstart cover concurrency, stale actions, side pots, disconnects, elimination, and closure. | PASS |
| P24/P25 — atomic and reproducible domain state | Table/hand snapshot, action append, participant balance, and completion transitions are persisted atomically; completed results are immutable. | PASS |
| P28/P29 — incremental development and no premature complexity | Scope is one table per started room with one active hand; no tournaments, multi-table orchestration, or analytics are included. | PASS |
| P31/P32/P33 — document decisions and preserve technology independence | Research records transport/storage tradeoffs; contracts describe behavior independently from implementation internals; technology choices are isolated in the plan. | PASS |

All pre-design gates pass. No constitutional exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/005-multiplayer-poker/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── table-http.md
│   └── realtime-events.md
└── tasks.md                  # created by /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── app.ts                         # Express/session middleware and HTTP routers
│   ├── server.ts                      # HTTP server and Socket.IO attachment
│   ├── shared/errors.ts               # stable API/socket error codes
│   ├── db/prisma/schema.prisma        # room/table/hand persistence models
│   ├── db/prisma/migrations/          # versioned schema changes
│   ├── poker-engine/                  # unchanged server-authoritative rules engine
│   └── modules/
│       ├── rooms/                    # started-room authorization and roster source
│       └── multiplayer/
│           ├── multiplayer.types.ts
│           ├── multiplayer.validation.ts
│           ├── multiplayer.repository.ts
│           ├── multiplayer.service.ts
│           ├── multiplayer.routes.ts
│           ├── multiplayer.socket.ts
│           ├── multiplayer.presence.ts
│           └── multiplayer.projection.ts
└── tests/
    ├── contract/multiplayer-table.test.ts
    ├── contract/multiplayer-actions.test.ts
    ├── integration/multiplayer-reconnect.test.ts
    ├── integration/multiplayer-concurrency.test.ts
    ├── integration/multiplayer-socket.test.ts
    └── unit/multiplayer-projection.test.ts

frontend/
├── src/
│   ├── services/multiplayerApi.ts
│   ├── services/multiplayerSocket.ts
│   ├── pages/MultiplayerTablePage.tsx
│   └── App.tsx
└── tests/
    └── multiplayer-table.test.tsx
```

**Structure Decision**: Keep the existing backend/frontend split. Add a focused `backend/src/modules/multiplayer/` boundary for persistence orchestration, authorization, projections, live events, and presence. Keep `backend/src/poker-engine/` independent and unchanged as the rules authority. Attach Socket.IO to the existing HTTP server in `server.ts`, while `app.ts` remains usable for HTTP tests. Add a single frontend table page and typed clients beside the existing room services/pages.

## Phase 0: Research Summary

Research decisions are recorded in [research.md](research.md):

1. Socket.IO is selected for live table updates, authenticated connections, room-scoped broadcast, and reconnect support.
2. PostgreSQL is the source of truth for table and hand state; in-memory socket state is delivery-only.
3. A transaction with a table/current-hand row lock, state version, idempotency key, engine transition, and post-commit broadcast prevents duplicate concurrent actions.
4. Existing session identity is reused for socket authorization; client-supplied user identity is never trusted.
5. Reconnect returns a complete authorized snapshot, allowing clients to recover without durable event cursors.
6. Presence timestamps and a server-owned reaper enforce the 60-second automatic-fold rule.

No unresolved `NEEDS CLARIFICATION` items remain.

## Phase 1: Design Summary

### Persistence and state flow

1. When a `STARTED` room is first opened as a table, create the unique `MultiplayerTable`, copy its fixed roster into `TableParticipant`, and create the first engine hand atomically.
2. On an action, authenticate the session, lock the table/current hand, validate `handId`, expected version, request ID, participant identity, turn, and action through the Poker Engine, then persist the new snapshot and action atomically.
3. On hand completion, persist the immutable result, update participant stacks and eligibility, eliminate zero-stack participants, and either create the next hand or close the table when fewer than two eligible players remain.
4. After commit, project the current state separately for each connected member and broadcast the appropriate state/presence event. A missed event is recovered through the HTTP or socket snapshot flow.

### Security and privacy

- Socket handshake authentication reads the existing session cookie using the same session store as HTTP.
- Table join and action authorization resolve room membership and seat from PostgreSQL.
- Snapshot projection removes raw deck state and redacts other players' cards until the engine marks a legitimate reveal.
- Error responses do not disclose private-room or non-member table details.

### Presence and recovery

- Heartbeats update `lastSeenAt` for the authenticated participant.
- Disconnect marks the participant offline and records `disconnectedAt`; it does not remove the seat.
- Reconnect restores the same participant and returns the newest authorized projection.
- A server-owned timeout job folds the acting participant exactly once after 60 seconds, then uses the same normal action/completion path.

### Frontend behavior

- `MultiplayerTablePage` renders public table state, the authenticated player's private cards, legal actions, connection status, and result/closure states.
- Socket events replace only newer state versions; reconnect requests a full snapshot.
- The UI can submit actions over the live connection or HTTP fallback, but both paths use the same backend validation and response projection.

## Constitution Re-check After Phase 1 Design

| Gate | Post-design evidence | Status |
|---|---|---|
| Server authority and private information | Only the Poker Engine changes game state; per-user projections prevent hidden-card leakage. | PASS |
| Real-time consistency and reconnect | Database versions/locks serialize actions; broadcasts occur after commit; reconnect returns a full snapshot. | PASS |
| Domain boundaries and engine reuse | Multiplayer orchestration is separate from room management, transport, persistence, and the pure Poker Engine. | PASS |
| Persistence and atomicity | Schema constraints and transactions protect one table/seat/hand identity and couple snapshots with action/result updates. | PASS |
| Testing and edge cases | Planned tests cover authorization, projection, concurrency, stale retries, reconnect, timeout fold, side pots, elimination, and closure. | PASS |
| Scope and complexity | One started-room table and one active hand are implemented; excluded tournament/multi-table/history features remain outside the plan. | PASS |
| Documentation and technology independence | Research, data model, contracts, and quickstart document behavior and rationale without changing constitutional principles. | PASS |

All post-design gates pass. No complexity exception is required.

## Complexity Tracking

No constitutional violations or unnecessary additional projects were identified. This section is intentionally empty.
