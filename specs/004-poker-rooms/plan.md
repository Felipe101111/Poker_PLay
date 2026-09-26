# Implementation Plan: Poker Rooms

**Branch**: `004-poker-rooms` | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-poker-rooms/spec.md`

## Summary

Feature 004 adds authenticated poker-room and lobby management before multiplayer gameplay. Users can create public or private waiting rooms, discover or join eligible rooms, invite accepted friends, manage readiness, transfer hosting when necessary, and close or start a room. The feature persists room state in PostgreSQL through Prisma, exposes server-authoritative REST operations, and deliberately stops before dealing or running a poker hand.

The design uses database-enforced uniqueness and short transactions for membership and seat allocation. A room entering `STARTED` locks its roster and configuration for the future multiplayer feature; it does not begin a hand in this feature.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 LTS; React 18 for the existing web client

**Primary Dependencies**: Existing Express application, Prisma 5 with PostgreSQL 16, Zod validation, express-session authentication, React Router, and Vitest/Supertest

**Storage**: PostgreSQL persistence for rooms, memberships, and invitations; existing session storage remains authoritative for authentication and online presence

**Testing**: Vitest unit tests, Supertest contract tests, and integration tests for concurrent final-seat and conflicting-membership operations; frontend TypeScript build and focused component tests where available

**Target Platform**: Existing Node.js backend and browser frontend

**Project Type**: Web application with REST backend and React frontend

**Performance Goals**: Normal room reads and writes should complete within 300 ms at the 95th percentile under the feature's expected load; concurrent seat claims must resolve deterministically without duplicate assignments

**Constraints**: All authorization is server-side; membership, seat allocation, invitation acceptance, host transfer, and lifecycle changes must be atomic; no WebSocket transport or poker-hand execution is included

**Scale/Scope**: Rooms support 2-9 seats and one active room membership per user; the design targets thousands of active waiting rooms and does not introduce tournament, hand-history, or real-time synchronization infrastructure

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Result |
|---|---|---|
| P3/P5/P23 — server authority, secure authentication, explicit authorization | Every room operation is authenticated and re-authorized in the service layer; private-room responses avoid information leakage. | PASS |
| P6/P21/P22 — clear boundaries, centralized identity, explicit friendship state | Room, membership, and invitation responsibilities remain separate and reference existing `User` and friendship state. | PASS |
| P18/P19/P20 — multiplayer architecture | This feature prepares a room for future multiplayer but does not implement game actions, WebSockets, or reconnect synchronization. | PASS |
| P24 — data integrity | Database uniqueness and transactions protect membership, seats, invitations, and lifecycle transitions. | PASS |
| P26/P27 — critical logic and edge cases tested | Unit, contract, and integration tests cover authorization, validation, capacity, duplicate membership, host transfer, invitation lifecycle, and concurrent final-seat claims. | PASS |
| P28/P29 — incremental development and avoid premature complexity | The design adds only room-lobby persistence and REST/UI surfaces required by the specification. | PASS |

## Project Structure

### Documentation (this feature)

```text
specs/004-poker-rooms/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── rooms-api.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   └── rooms/
│   │       ├── rooms.routes.ts
│   │       ├── rooms.service.ts
│   │       ├── rooms.validation.ts
│   │       └── rooms.types.ts
│   ├── db/prisma/
│   │   └── schema.prisma
│   └── shared/
│       └── errors.ts
└── tests/
    ├── contract/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── pages/
│   │   └── RoomsPage.tsx
│   └── services/
│       └── roomsApi.ts
└── tests/
```

**Structure Decision**: Extend the existing backend module layout with `backend/src/modules/rooms/`, keeping validation, routes, service logic, and room authorization separate from the pure Poker Engine. Add Prisma models to the existing schema, contract/integration tests beside features 001-003, and a `RoomsPage` plus room API client in the existing frontend. No new top-level project is required.

## Design Decisions

- Use PostgreSQL-backed `PokerRoom`, `RoomMember`, and `RoomInvitation` records.
- Enforce `(roomId, userId)`, `(roomId, seatNumber)`, and active `userId` uniqueness at the database boundary.
- Allocate the lowest available seat in a transaction and translate unique-constraint races into stable API errors.
- Use explicit `WAITING`, `STARTED`, and `CLOSED` room states; `STARTED` locks the lobby but does not start poker gameplay.
- Use a 15-minute inactivity timeout for waiting-room members whose session is no longer active; refresh `lastSeenAt` on authorized room reads/actions.
- Keep invitation transitions explicit and invalidate pending invitations when a room starts or closes.
- Reuse existing authentication middleware, Zod validation, centralized error envelopes, Prisma transaction conventions, and Supertest test helpers.

## Complexity Tracking

No constitution violations requiring an exception were identified.

## Post-Design Constitution Check

All gates remain PASS after the design. The room module is separated from the Poker Engine and frontend, private-room data is authorization-scoped, concurrent membership changes are protected by persistence constraints and transactions, and real-time gameplay remains explicitly deferred.
