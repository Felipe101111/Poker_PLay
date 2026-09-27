# Backend — Poker Platform

Node.js 20 + TypeScript + Express + Prisma + PostgreSQL backend implementing authentication, friends, local poker hands, poker rooms, and multiplayer tables.

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
