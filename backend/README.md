# Backend — Poker Platform (User Authentication)

Node.js 20 + TypeScript + Express + Prisma + PostgreSQL backend implementing feature `001-user-authentication` (register, login, logout, profile).

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
npm.cmd run prisma:migrate   # creates the users table; connect-pg-simple creates its own session table on first run
npm.cmd run dev
```

## Tests

```powershell
npm.cmd test
```

Contract tests (`tests/contract/`) and integration tests (`tests/integration/`) require a reachable `DATABASE_URL` — they exercise the real Express app + Postgres via Supertest and Prisma. Unit tests (`tests/unit/`) have no such dependency.

## Project layout

- `src/app.ts` — Express app wiring (JSON/cookie parsing, CORS, session, routes, error handler)
- `src/modules/auth/` — registration, login, logout, profile (this feature's only domain module)
- `src/db/prisma/` — Prisma schema/client (the `User` table); the session table is managed separately by `connect-pg-simple`
- `src/shared/` — cross-cutting helpers (error shape)

See [../specs/001-user-authentication/quickstart.md](../specs/001-user-authentication/quickstart.md) for end-to-end validation steps.
