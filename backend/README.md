## Equity and strategy boundary

`src/modules/equity` is a pure exact calculator built on the Poker Engine evaluator. `src/modules/strategy` owns versioned manifests, immutable rows, and explicit `UNAVAILABLE` results. Trainer remains the authenticated boundary; clients cannot submit authoritative private cards, ranges, or dataset contents.
# Backend — Poker Platform

Node.js 20 + TypeScript + Express + Prisma + PostgreSQL backend implementing authentication, friends, local poker hands, poker rooms, multiplayer tables, and the preflop/postflop Poker Trainer.

## Prerequisites

- Node.js 20+ and npm (use `npm.cmd` on Windows if PowerShell's execution policy blocks `npm.ps1`)
- PostgreSQL 16 reachable via `DATABASE_URL` — either:
  - `docker compose up -d postgres` (from the repo root, uses `docker-compose.yml`), or
  - a native PostgreSQL 16 install

## Environment variables

Copy `.env.example` to `.env` and adjust as needed:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (also used by `connect-pg-simple` for the session table) |
| `SESSION_SECRET` | Secret used to sign the session cookie — use a long random string in production |
| `PORT` | Backend HTTP port (default `3000`) |
| `NODE_ENV` | `development` locally; set to `production` to enable the `Secure` cookie flag (requires HTTPS) |
| `FRONTEND_ORIGIN` | Exact origin allowed by CORS to send credentialed requests (default `http://localhost:5173`) |

## Setup

```powershell
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
npm.cmd run dev
```

## Tests

```powershell
npm.cmd test
```

Contract tests (`tests/contract/`) and integration tests (`tests/integration/`) require a reachable `DATABASE_URL` — they exercise the real Express app + Postgres via Supertest and Prisma. Unit tests (`tests/unit/`) have no such dependency.

## Poker Trainer (feature 006)

The trainer is a server-authoritative, preflop-only six-player experience using 100 BB virtual stacks. It reuses the Poker Engine for dealing and legal actions, stores a server-generated seed and immutable snapshots in PostgreSQL, and evaluates decisions against the bounded `preflop-v1` dataset at `src/modules/trainer/data/preflop-strategy.v1.json`.

Authenticated endpoints are grouped under `/api/trainer`: start/resume and current session, decision submission, continuation, and personal progress. The server derives identity from the session cookie. Responses expose only the authenticated player's hole cards and projected scenario data; engine snapshots, raw decks, future boards, and opponent cards remain server-side.

Missing strategy rows are recorded as `UNAVAILABLE` without fabricated advice. Repeating a decision request with the same retry key returns the original immutable result. See [../specs/006-poker-trainer/quickstart.md](../specs/006-poker-trainer/quickstart.md) for migration, tests, recovery, security, and performance validation.

## Poker Trainer postflop (feature 008)

Postflop sessions use the dedicated `/api/trainer/postflop/session/*` endpoints. A session starts on a deterministic three-card flop, then advances to four cards on turn and five on river only after the current decision is persisted. Fold, all-in, showdown, and complete hands stop the sequence without fabricating a later street.

The response exposes only the player's cards, visible board, pot, position, legal actions, and ordered decision review. Raw decks, future cards, opponent hole cards, internal engine bookkeeping, client ranges, and client strategy versions are never accepted or projected. Strategy availability and exact-equity limitations are retained in immutable evaluation snapshots. Apply `20260928000500_add_postflop_trainer` with `npm.cmd run prisma:migrate:deploy` before running the postflop contract suite. See [../specs/008-poker-trainer-postflop/quickstart.md](../specs/008-poker-trainer-postflop/quickstart.md) and [../specs/008-poker-trainer-postflop/contracts/trainer-postflop-http.md](../specs/008-poker-trainer-postflop/contracts/trainer-postflop-http.md).

## Hand history (feature 009)

Hand history is persisted separately from active game state and accepts only terminal snapshots through the internal publisher boundary. Authenticated clients use `GET /api/hand-history` for bounded filters and pagination, `GET /api/hand-history/:historyId` for ordered detail, and `DELETE /api/hand-history/:historyId` to remove their own association. Responses omit raw decks, unauthorized private cards, and engine state; shared records retain other participants through anonymization. See [../specs/009-hand-history/quickstart.md](../specs/009-hand-history/quickstart.md) for migration, focused tests, privacy checks, and the deferred Feature 010-013 roadmap.

## Hand replay (feature 010)

Authenticated users can request `GET /api/hand-history/:historyId/replay` for an authorized terminal history. The response contains the projected initial state, ordered visible events, terminal state, and explicit limitation records for legacy gaps, anonymized data, unavailable states, or empty timelines. Unauthorized and nonexistent IDs share the same not-found response; replay never writes to the history record. See [../specs/010-hand-replay/quickstart.md](../specs/010-hand-replay/quickstart.md).

## Hand analytics (feature 011)

`GET /api/hand-history/analytics` is an authenticated, read-only aggregation over terminal histories that the session user may list. Optional `from`, `to`, `format`, and `relatedLimit` query parameters define one effective scope for the complete response. The response contains summary values, daily trend points, VPIP/PFR/3-bet/win-rate metrics with numerator, denominator, and a 30-observation sufficiency threshold, position/street breakdowns, limitations, and up to 50 related hands.

Analytics reads the optional public `publicSnapshot.analytics` block. Legacy histories without that block remain valid and produce explicit `DATA_UNAVAILABLE` limitations with null values; the service does not infer gains or EV and introduces no Prisma migration. Related hands contain only identifiers, dates, format, contribution labels, and authorization flags.

## Strategy administration (feature 012)

Editorial administration is session-authenticated and role-guarded under `/api/strategy/admin`. `EDITOR` users create datasets and drafts, `REVIEWER` users validate and inspect history, `PUBLISHER` users publish or retire versions, and `ADMIN` users also manage roles and audit access. Draft edits require `expectedRevision`; publication is transactional and replaces only the active compatible version. Published and retired versions cannot be edited. Apply migration `20260928090000_strategy_administration` with `npm.cmd run prisma:migrate:deploy` before running the administration contract suite. The browser editor is available at `/strategy/administration`.

## Multiplayer tables (feature 005)

Started rooms expose one server-authoritative table at `/api/rooms/:roomId/table` and `/api/rooms/:roomId/table/actions`; Socket.IO events use the authenticated session and the same authorization/projection rules. PostgreSQL persists table, hand, participant, presence, and idempotent action state. Reconnect retains the fixed seat, and disconnected acting players are auto-folded after 60 seconds. The feature uses virtual chips only and excludes tournaments, real-money balances, and multi-table play. See [../specs/005-multiplayer-poker/quickstart.md](../specs/005-multiplayer-poker/quickstart.md).

## Local Poker Engine API (feature 003)

The pure Poker Engine lives in `src/poker-engine/` and has no Express, Prisma, Zod, or frontend dependencies. It owns card dealing, blind posting, legal actions, betting-round transitions, pot calculation, hand evaluation, showdown, and server-side result awarding. The local-games module is only the authenticated HTTP/in-memory wrapper around that engine.

All endpoints require the feature 001 session cookie:

| Method & Path | Purpose |
|---|---|
| `POST /api/local-games` | Start one local 2-9 seat hand |
| `GET /api/local-games/current?asSeat={seatNumber}` | Read the redacted state from one seat's perspective |
| `POST /api/local-games/current/actions` | Submit a server-validated fold/check/call/bet/raise/all-in action |
| `DELETE /api/local-games/current` | Abandon the active hand idempotently |

The wrapper keeps one active hand per authenticated user in memory. The complete response never exposes the remaining deck or another seat's hole cards before showdown. Hand history is intentionally not persisted in feature 003; use the feature quickstart for end-to-end validation.

## Project layout

- `src/app.ts` — Express app wiring (JSON/cookie parsing, CORS, session, routes, error handler)
- `src/modules/auth/` — registration, login, logout, profile (feature 001); also exports `isUserOnline(userId)` (session-presence.ts) reused by the friends module
- `src/modules/friends/` — search, friend requests, accept/reject/cancel, friends list, remove (feature 002)
- `src/modules/rooms/` — persistent room creation, public discovery, membership, invitations, readiness, host transfer, and lifecycle controls (feature 004)
- `src/db/prisma/` — Prisma schema/client (`User`, `FriendRequest`, `PokerRoom`, `RoomMember`, `RoomInvitation`); the session table is managed separately by `connect-pg-simple`
- `src/shared/` — cross-cutting helpers (error shape)

## Friends API (feature 002)

All endpoints below live under `/api/friends` and require an authenticated session (same cookie as `/api/auth/login`). See [../specs/002-friends-system/contracts/friends-api.md](../specs/002-friends-system/contracts/friends-api.md) for full request/response details.

| Method & Path | Purpose |
|---|---|
| `GET /api/friends/search?query=` | Search other users by username |
| `POST /api/friends/requests` | Send a friend request |
| `GET /api/friends/requests` | List your incoming/outgoing pending requests |
| `POST /api/friends/requests/:id/accept` | Accept an incoming request |
| `POST /api/friends/requests/:id/reject` | Reject an incoming request |
| `DELETE /api/friends/requests/:id` | Cancel a request you sent |
| `GET /api/friends` | List your friends, each with an `online` flag |
| `DELETE /api/friends/:userId` | Remove a friend |

See [../specs/001-user-authentication/quickstart.md](../specs/001-user-authentication/quickstart.md) and [../specs/002-friends-system/quickstart.md](../specs/002-friends-system/quickstart.md) for end-to-end validation steps.

## Rooms API (feature 004)

Room endpoints live under `/api/rooms` and require an authenticated session. Public `WAITING` rooms can be listed and joined; private rooms require an accepted-friend invitation. Membership, seat allocation, invitations, readiness, host transfer, and lifecycle changes are server-authoritative and transaction-protected.

The lifecycle is `WAITING -> STARTED` or `WAITING -> CLOSED`. Starting a room fixes its roster and configuration but does not deal cards, execute a hand, or require WebSockets. Pending invitations are invalidated when a room starts or closes. Waiting-room presence cleanup releases members inactive for 15 minutes when their session is no longer active.

See [../specs/004-poker-rooms/contracts/rooms-api.md](../specs/004-poker-rooms/contracts/rooms-api.md) for request and response details.
