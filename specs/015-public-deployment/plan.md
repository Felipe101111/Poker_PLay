# Implementation Plan: Public Deployment

**Branch**: `015-public-deployment` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/015-public-deployment/spec.md`

## Summary

Make the existing Poker Platform reachable through a public HTTPS URL using Render, while preserving the current server-authoritative poker behavior, authenticated sessions, persistent PostgreSQL data, Socket.IO multiplayer flows, and private-information boundaries. The design uses a Render Static Site for the Vite frontend, a Render Web Service for the Express and Socket.IO backend, and Render PostgreSQL for persistence. A safe backend health endpoint and controlled schema-deployment step provide operational readiness and recovery signals.

## Technical Context

**Language/Version**: Node.js 20+, TypeScript, React 18, Vite 5

**Primary Dependencies**: Express, Prisma, PostgreSQL, Socket.IO, Render Static Site/Web Service/PostgreSQL

**Storage**: Managed Render PostgreSQL, including the existing application tables and session store

**Testing**: Backend Vitest/Supertest, frontend Vitest/React Testing Library, TypeScript builds, ESLint, Render health and remote smoke checks

**Target Platform**: Render-managed HTTPS services in one region; browser clients on supported desktop and mobile browsers

**Project Type**: Full-stack web application with static frontend, authenticated backend, persistent database, and real-time multiplayer transport

**Performance Goals**: Public entry and health checks should respond within normal web-service expectations; after a restart the service should recover within 10 minutes; existing poker action and session behavior remains functionally unchanged

**Constraints**: HTTPS, exact credentialed CORS origin, secure production cookies, no committed secrets, provider-assigned `PORT` binding on `0.0.0.0`, controlled migrations, Socket.IO support, no client authority over poker state or private information

**Scale/Scope**: First public release for a small personal/test audience; one frontend service, one backend service, one managed PostgreSQL database, one documented public entry URL, and two-browser multiplayer smoke validation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The plan passes the constitution gate:

- **Server authority and security (Principles 3-5)**: Render only hosts the existing backend boundary; production secrets, secure cookies, exact CORS, authorization, and private-card projection remain server-controlled.
- **Separation of responsibilities (Principles 6-8)**: Frontend, backend, database, and deployment configuration remain distinct; no poker or strategy logic moves into deployment artifacts.
- **Multiplayer architecture (Principles 18-20)**: The backend remains the canonical table state owner; Socket.IO reconnect and disconnected states are explicitly tested.
- **Data integrity (Principles 24-25)**: Managed PostgreSQL and controlled migrations preserve persistent domain state and historical records.
- **Testing and incremental development (Principles 26-30)**: Existing automated suites are retained, health/smoke checks are added, and the implementation is split into small operational changes.
- **Documentation and source of truth (Principles 31-32)**: Render decisions, deployment contracts, data model, and quickstart are recorded in this feature directory.

No constitution violations or complexity exceptions are required before Phase 0 or after Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/015-public-deployment/
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
│   ├── modules/
│   └── db/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

specs/015-public-deployment/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
  └── deployment-contract.md
```

**Structure Decision**: Keep the existing `backend/` and `frontend/` projects separate. Add the health/readiness behavior to the backend, production configuration/build inputs to the deployment surfaces, and operational documentation under `specs/015-public-deployment/`. Do not introduce a new domain module or move existing poker logic.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | No constitution violations identified | Existing frontend, backend, and managed database service boundaries satisfy the feature without an additional application project |
