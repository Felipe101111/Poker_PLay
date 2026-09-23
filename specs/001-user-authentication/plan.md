# Implementation Plan: User Authentication (Register, Login, Profile)

**Branch**: `001-user-authentication` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-user-authentication/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Registered users can create an account, log in, log out, and view/edit their profile (username = display name), with the server as the sole authority over identity and session state. This is the foundational feature of the Poker Platform: every later feature (friends, rooms, Poker Engine, Trainer) attaches to the `User` identity created here. Technical approach: a Node.js/TypeScript backend exposing a small REST API, PostgreSQL for durable storage, Argon2id password hashing, and server-side sessions (opaque ID in an HttpOnly cookie) with a 7-day sliding expiration — chosen for simplicity, OWASP-aligned security defaults, and easy reuse of the same cookie-based session for the WebSocket authentication needed by later real-time features.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 LTS (backend); TypeScript + React 18 (frontend) — one language across the stack simplifies sharing domain types (e.g., `User`) as the project grows into the Poker Engine and real-time features.

**Primary Dependencies**: Express 4 (HTTP API), Prisma ORM (PostgreSQL access + migrations), `argon2` (password hashing), `express-session` + `connect-pg-simple` (server-side session store backed by Postgres, no extra infra), `zod` (server-side request validation). Frontend: React 18 + Vite + React Router.

**Storage**: PostgreSQL 16. Relational storage fits the `User`/`Session` model now and the `Friendship`/`PokerRoom`/`TournamentPlayer` relations planned for upcoming features (Constitution Article IX).

**Testing**: Vitest + Supertest for backend contract/integration tests (registration, login, session, profile); Vitest + React Testing Library for frontend component tests. Constitution Article X requires automated tests for this critical logic (auth rules).

**Target Platform**: Containerized Linux server (backend + Postgres), modern evergreen web browsers (frontend).

**Project Type**: Web application (frontend + backend split).

**Performance Goals**: Auth API endpoints (register/login/session-check/profile) respond within 300ms p95 server-side under normal load (supports SC-001/SC-002 end-to-end targets once network/UI time is added).

**Constraints**: Session cookie MUST be `HttpOnly`, `Secure`, `SameSite=Lax`; passwords MUST be hashed with Argon2id (never logged or stored in plaintext, Constitution Principle 5); all inputs validated server-side regardless of client validation (Constitution Principle 3).

**Scale/Scope**: MVP scale — designed for a low hundreds of concurrent users initially (consistent with 6–9 player tables), not high-throughput/horizontally-scaled from day one; the session/data model must not block scaling out later.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| P3 — Never trust the client | All auth/session/profile input is validated server-side with `zod`; client-side validation is UX-only. | PASS |
| P5 — Secure authentication | Passwords hashed with Argon2id, never stored/logged in plaintext; sessions use opaque IDs, not guessable tokens. | PASS |
| P6 — Clear domain boundaries | Auth/session/profile logic lives in a dedicated `backend/src/modules/auth` module, isolated from future Friends/Rooms/Poker Engine modules. | PASS |
| P12/P21 — Centralized user identity | `User` is the single anchor entity later features (friends, rooms, poker/trainer history) will reference by ID. | PASS |
| P24 — Persistence reflects domain state | Registration (user create) runs in a single DB transaction; no partial user records on failure. | PASS |
| P26 — Critical logic requires automated tests | Contract + integration tests planned for register/login/logout/profile and session expiry. | PASS |
| P33 — Architecture before framework | Stack chosen to satisfy this feature's and the roadmap's requirements (relational data, future WebSocket reuse of session cookie), not the reverse; documented in research.md. | PASS |
| Documented temporary exception (spec.md) | FR-016 defers login rate limiting/lockout to a future security-hardening feature. This is a known, time-boxed deviation from Article II's rate-limiting expectation, not a silent gap. | ACCEPTED (temporary, tracked in spec.md) |

No unjustified violations. Re-checked after Phase 1 design below.

## Project Structure

### Documentation (this feature)

```text
specs/001-user-authentication/
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
│   ├── modules/
│   │   └── auth/
│   │       ├── auth.routes.ts        # POST /register, /login, /logout
│   │       ├── auth.service.ts       # registration/login business logic
│   │       ├── auth.middleware.ts    # session/auth guard for protected routes
│   │       ├── users.routes.ts       # GET/PATCH /users/me
│   │       └── users.service.ts      # profile read/update logic
│   ├── db/
│   │   └── prisma/                   # Prisma schema + migrations (User, Session)
│   └── app.ts                        # Express app wiring (routes, session middleware)
└── tests/
    ├── contract/                     # request/response shape tests per contracts/
    └── integration/                  # register→login→profile→logout flows

frontend/
├── src/
│   ├── pages/
│   │   ├── RegisterPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── ProfilePage.tsx
│   ├── services/
│   │   └── authApi.ts                # typed client for the auth REST API
│   └── components/
└── tests/
    └── unit/                         # form validation + page behavior tests
```

**Structure Decision**: Web application split (Option 2) — `backend/` (Node/TypeScript/Express/Prisma REST API) and `frontend/` (React/TypeScript pages for Register/Login/Profile). All poker-domain-authoritative logic will live in backend modules added by later features (e.g., `backend/src/modules/poker-engine`), kept separate from `auth` per Constitution Principle 6.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No unjustified violations — the single accepted deviation (no login rate limiting/lockout in this iteration) is a documented, time-boxed temporary exception recorded in `spec.md` under "Documented Temporary Constitutional Exception," not an undocumented complexity add.

## Post-Design Constitution Re-Check

*Performed after Phase 1 (data-model.md, contracts/, quickstart.md).*

- `data-model.md` keeps `User` and `Session` as the only entities, with no fields duplicating information that belongs to future features (friends, rooms) — still satisfies P6/P36 (single responsibility, no premature coupling).
- `contracts/auth-api.md` never returns the password hash or any other credential material in any response — satisfies P4 (private information stays private) and P5.
- `quickstart.md` validation steps exercise the server-authoritative rules directly against the API (not asserting on client state) — satisfies P1/P3 (server is authoritative, client is untrusted).
- No new violations introduced by the design artifacts. **Gate: PASS.**
