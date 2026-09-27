# Implementation Plan: Poker Trainer Preflop Decisions

**Branch**: `006-poker-trainer` | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-poker-trainer/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Build an authenticated preflop Poker Trainer that generates reproducible six-player, 100 BB scenarios, evaluates legal decisions against a bounded versioned strategy dataset, persists idempotent results, and exposes personal progress. The implementation will add a dedicated backend trainer module and Prisma models while reusing the existing session authentication, Poker Engine, Express error handling, and React API/page patterns.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript on Node.js 20+; React 18 with Vite

**Primary Dependencies**: Express, Prisma, PostgreSQL, Zod, existing Poker Engine, React Router, Vitest, Testing Library

**Storage**: PostgreSQL through Prisma; versioned strategy dataset maintained in project source/data files

**Testing**: Vitest, Supertest contract/integration tests, React Testing Library, TypeScript build, ESLint

**Target Platform**: Node.js backend and modern browser frontend, locally and in the existing web deployment

**Project Type**: Web application with Express API and React frontend

**Performance Goals**: Decision-ready session response under 5 seconds in at least 95% of normal attempts; decision evaluation and progress reads should remain within the existing API request profile

**Constraints**: Server-authoritative legality and evaluation; no future board or opponent private information; deterministic seeded scenarios; no external solver or real-money behavior; unavailable strategy data must not produce advice

**Scale/Scope**: First preflop-only increment, one active session per player, fixed six-player/100 BB format, virtual chips, authenticated users, extensible to later streets without changing existing record meaning

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- PASS: Poker rules, legal actions, and scenario state remain server-authoritative and reuse the independent Poker Engine.
- PASS: Strategy data, evaluation, persistence, transport, and frontend presentation are separate responsibilities.
- PASS: Private cards and player progress are scoped to the authenticated user; routes use the existing session middleware.
- PASS: Mixed strategies and unavailable strategy data are represented explicitly; no arbitrary advice is generated.
- PASS: Virtual chips only; postflop, tournaments, multiplayer control, and real-money play remain out of scope.
- PASS: Persistence and decision submission are designed for idempotency and transaction-safe ownership checks.

## Project Structure

### Documentation (this feature)

```text
specs/006-poker-trainer/
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
│   ├── poker-engine/
│   └── shared/
└── tests/
frontend/
├── src/pages/
├── src/services/
└── tests/
```

**Structure Decision**: Extend the existing backend/frontend web application with a dedicated `trainer` module. The backend owns scenario generation, strategy lookup, evaluation, authorization, and persistence; the frontend owns rendering and request state only. Existing `poker-engine`, authentication/session middleware, Prisma client, API client, and test helpers are reused.

## Complexity Tracking

No constitution violations requiring a deviation are identified.
