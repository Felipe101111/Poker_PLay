# Implementation Plan: Friends System

**Branch**: `002-friends-system` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-friends-system/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Authenticated users can search other users by username, send/accept/reject/cancel friend requests, view their accepted friends with an online/offline indicator, and remove a friendship — all built as a new `friends` module on top of feature 001's existing Express/Prisma/PostgreSQL backend and React frontend, reusing 001's session-based auth guard for both authorization and the "online" signal. Technical approach: a single `FriendRequest` table keyed by an order-independent user pair (so A→B and B→A can never coexist as separate rows), with request/friendship state changes performed as physical row mutations (insert/delete) rather than an accumulating status history, per the spec's clarified "no history" decision.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 LTS (backend, unchanged from feature 001); TypeScript + React 18 (frontend, unchanged).

**Primary Dependencies**: Reuses feature 001's stack as-is — Express 4, Prisma ORM, `zod` for validation. No new runtime dependencies are needed for this feature.

**Storage**: PostgreSQL 16 (same database as feature 001). One new table, `friend_requests`, added via Prisma migration; no changes to the existing `users` table or the session store.

**Testing**: Vitest + Supertest (backend contract/integration tests), following the same `fileParallelism: false` convention established in feature 001 for tests sharing one real database.

**Target Platform**: Same containerized Linux server + PostgreSQL + evergreen browsers as feature 001.

**Project Type**: Web application (frontend + backend split) — extends the existing `backend/` and `frontend/` projects from feature 001; no new projects created.

**Performance Goals**: Friend search, request, and list endpoints respond within 300ms p95 server-side under normal load (same bar as feature 001's auth endpoints).

**Constraints**: All friend/request endpoints require an authenticated session (reusing feature 001's `requireAuth` middleware, Constitution Principle 3); search results and friend list responses MUST NOT expose email or password data (Constitution Principle 4, spec FR-002).

**Scale/Scope**: Same MVP scale as feature 001 (low hundreds of concurrent users); no new infrastructure.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| P3 — Never trust the client | All search/request/response bodies validated server-side with `zod`; authorization (who may accept/reject/cancel) re-checked server-side regardless of what the client requests. | PASS |
| P4 — Private information stays private | Search and friend-list responses return only `id`/`username`/online-flag — never `email` or `passwordHash`. | PASS |
| P6 — Clear domain boundaries | New logic lives in `backend/src/modules/friends/`, separate from `modules/auth/`; the only cross-module dependency is a small, explicit `isUserOnline(userId)` helper exported from `modules/auth`. | PASS |
| P21 — Centralized user identity | `FriendRequest` references `User.id` from feature 001; no duplicate identity concept introduced. | PASS |
| P22 — Friendship state must be explicit | Explicit `PENDING`/`ACCEPTED` states, enforced uniqueness per unordered pair, explicit rules against self-requests and duplicate/conflicting requests (FR-004, FR-005, FR-006). | PASS |
| P23 — Authorization must be explicit | Only the receiver may accept/reject; only the sender may cancel; only a friendship member may remove it — enforced server-side, not just hidden in the UI. | PASS |
| P24 — Persistence reflects domain state | Unordered-pair unique constraint + transactional accept/insert logic prevents two coexisting rows for the same pair (FR-005/FR-006); physical delete on cancel/remove/reject avoids orphaned inconsistent rows. | PASS |
| P26 — Critical logic requires automated tests | Contract + integration tests planned for every user story, including the concurrent mutual-request race (FR-006). | PASS |
| P29 — Do not over-engineer prematurely | Reuses feature 001's stack and session table as-is; no new infra (e.g., no message queue or cache) introduced for a feature at this scale. | PASS |

No violations. Re-checked after Phase 1 design below.

## Project Structure

### Documentation (this feature)

```text
specs/002-friends-system/
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
│   │   ├── auth/                      # feature 001 (unchanged) — exports isUserOnline() for reuse
│   │   └── friends/                   # NEW for this feature
│   │       ├── friends.routes.ts      # /api/friends/* and /api/friends/requests/*
│   │       ├── friends.service.ts     # search/send/accept/reject/cancel/remove/list logic
│   │       ├── friends.repository.ts  # Prisma access for FriendRequest
│   │       └── friends.validation.ts  # zod schemas (search query, receiverId)
│   └── db/prisma/                     # schema.prisma gains the FriendRequest model + migration
└── tests/
    ├── contract/                      # request/response shape tests per contracts/
    └── integration/                   # multi-user flows incl. the FR-006 race scenario

frontend/
├── src/
│   ├── pages/
│   │   └── FriendsPage.tsx            # search, incoming/outgoing requests, friends list
│   └── services/
│       └── friendsApi.ts              # typed client for the friends REST API
└── tests/
    └── unit/
```

**Structure Decision**: Extends the existing web application split from feature 001 — no new top-level projects. A new `backend/src/modules/friends/` module keeps this feature's logic isolated from `modules/auth/` (Constitution Principle 6), and a single new `FriendsPage.tsx` covers all four user stories on the frontend (search + requests + list + remove are one cohesive screen, not separate pages, since they all operate on the same "who am I connected to" concept).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations to justify.

## Post-Design Constitution Re-Check

*Performed after Phase 1 (data-model.md, contracts/, quickstart.md).*

- `data-model.md`'s unordered-pair unique constraint and physical-delete lifecycle keep exactly one row per user pair at all times — no path produces two conflicting rows (P22/P24).
- `contracts/friends-api.md` never returns `email` or `passwordHash` in search or friend-list responses (P4).
- Every mutating endpoint in `contracts/friends-api.md` is documented as requiring the feature 001 session cookie and re-validates the acting user server-side (P3/P23) — the receiver-only accept/reject and sender-only cancel rules are enforced in the service layer, not just hidden in the UI.
- No new infrastructure or dependencies were introduced in Phase 1 beyond what feature 001 already provides (P29).
- No new violations introduced by the design artifacts. **Gate: PASS.**

