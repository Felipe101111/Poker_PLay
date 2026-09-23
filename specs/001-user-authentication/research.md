# Phase 0 Research: User Authentication

All Technical Context items were resolvable from the feature spec, the project constitution, and established industry practice for a small-to-medium web platform with a real-time future (WebSocket-based poker tables). No open `NEEDS CLARIFICATION` markers remain.

## Decision: Backend runtime & language — Node.js 20 LTS + TypeScript

- **Rationale**: The roadmap's later features (Poker Engine, real-time multiplayer, Strategy/Equity Engines) are naturally served by a single language across backend and frontend so domain types (e.g., `User`, later `Card`/`GameState`) can be shared without duplication or drift. Node.js has first-class WebSocket support, which the Etapa 8 (multiplayer) feature will need, so introducing it now avoids a stack migration later.
- **Alternatives considered**:
  - *Python (FastAPI)*: Excellent for the Equity Engine's numerical work later, but would split the stack into two languages this early, duplicating domain types between an auth service and a future engine service.
  - *Go*: Great performance/concurrency, but smaller ecosystem for rapid CRUD/session/web work and a steeper ramp for a project prioritizing incremental delivery (Constitution Principle 28/29).

## Decision: Web framework — Express 4

- **Rationale**: Minimal, extremely well-documented, sufficient for a small REST surface (register/login/logout/profile). Avoids adopting a heavier opinionated framework (e.g., NestJS) before the project has enough modules to justify that structure (Principle 29 — do not over-engineer prematurely).
- **Alternatives considered**:
  - *Fastify*: Faster raw throughput, but the performance goal (300ms p95) is easily met by Express at this scale; Express's simplicity wins for now.
  - *NestJS*: Provides DI/module structure out of the box, which becomes attractive once Friends/Rooms/Poker Engine modules exist, but is unnecessary ceremony for a single auth module today. Revisit if module count grows.

## Decision: ORM & database — Prisma + PostgreSQL 16

- **Rationale**: Relational integrity (unique email/username, FK from future `Friendship`/`PokerRoom` tables to `User`) is a natural fit for PostgreSQL. Prisma gives type-safe queries and migration tooling, reducing the risk of the kind of partial/inconsistent records Constitution Principle 24 warns against.
- **Alternatives considered**:
  - *MongoDB*: Flexible schema is not needed here — `User` and `Session` are well-structured, and future entities (Friendship, PokerHand) benefit from relational constraints, not schema flexibility.
  - *TypeORM*: Viable alternative to Prisma; Prisma chosen for its simpler migration workflow and generated types.

## Decision: Password hashing — Argon2id (`argon2` npm package)

- **Rationale**: OWASP's current recommendation for password hashing; resistant to GPU/ASIC cracking better than bcrypt at equivalent settings. Satisfies Constitution Principle 5 (secure, one-way hashing).
- **Alternatives considered**:
  - *bcrypt*: Still acceptable and widely used, but Argon2id is the stronger current default and the `argon2` package is well-maintained for Node.js.

## Decision: Session strategy — server-side session, opaque ID in an HttpOnly cookie, Postgres-backed store, 7-day sliding expiration

- **Rationale**: Matches the spec's clarified session policy (FR-008) exactly. An opaque server-side session (via `express-session` + `connect-pg-simple`) avoids the revocation problems of stateless JWTs (a JWT can't be un-issued before its expiry without an extra denylist mechanism) and avoids adding a new infra dependency (Redis) before it's needed — Postgres, already required for `User` data, hosts the session table too (Principle 29).
- **Alternatives considered**:
  - *JWT (stateless)*: Would need a revocation/denylist mechanism to support logout semantics (FR-009) correctly, adding complexity without a corresponding benefit at this scale.
  - *Redis-backed sessions*: Better for very high session churn/horizontal scale, but premature for the stated Scale/Scope (low hundreds of concurrent users). Revisit if/when horizontal scaling is required.

## Decision: Frontend — React 18 + TypeScript + Vite

- **Rationale**: Matches the shared-language decision above; Vite gives fast local iteration for the Register/Login/Profile pages this feature needs. React is a safe, ubiquitous choice for the richer, stateful Poker Table UI that later features will require.
- **Alternatives considered**:
  - *Vue*/*Svelte*: Equally valid; React chosen for ecosystem maturity and hiring/community support, not a hard technical requirement (Constitution Article XIII leaves this open).

## Decision: Testing — Vitest + Supertest (backend), Vitest + React Testing Library (frontend)

- **Rationale**: Vitest integrates natively with a Vite/TypeScript stack; Supertest is the standard way to write HTTP contract tests against an Express app without a running server process. Satisfies Constitution Principle 26 (mandatory automated tests for critical logic — here, registration/login/session/profile rules).
- **Alternatives considered**:
  - *Jest*: Also viable; Vitest chosen for faster iteration and native ESM/TypeScript support without extra config.
