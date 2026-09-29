---

description: "Task list for Feature 015 Public Deployment"
---

# Tasks: Public Deployment

**Input**: Design documents from `/specs/015-public-deployment/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/deployment-contract.md](contracts/deployment-contract.md), and [quickstart.md](quickstart.md)

**Tests**: Deployment tests and smoke-validation tasks are included because the feature's acceptance criteria require proving public health, authentication, persistence, multiplayer connectivity, privacy, and recovery.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently after shared deployment foundations are ready.

## Phase 1: Setup

**Purpose**: Establish provider-facing configuration and deployment documentation surfaces without changing poker behavior.

- [X] T001 [P] Create the Render Blueprint/service configuration in `render.yaml` for one frontend Static Site, one backend Web Service, and one PostgreSQL database, using the repository's `frontend/` and `backend/` roots.
- [X] T002 [P] Add production-safe environment variable templates and deployment notes without secret values in `backend/.env.example`, `frontend/.env.example`, and `README.md`.
- [X] T003 [P] Add a deployment smoke-test command and documented local prerequisites in `specs/015-public-deployment/quickstart.md`, keeping provider credentials and production secrets out of source control.

---

## Phase 2: Foundational

**Purpose**: Implement the shared readiness, runtime, and security prerequisites that block every public-deployment story.

- [X] T004 Add a safe unauthenticated `GET /health` route in `backend/src/app.ts` that returns `200` with `{ status: "ok", service: "poker-play-backend", dependencies: { database: "ok" } }` when required persistence is available, and returns `503` with `{ status: "unavailable", service: "poker-play-backend", dependencies: { database: "unavailable" } }` without credentials, stack traces, user data, cards, or game state when it is not.
- [X] T005 [P] Add focused health contract coverage in `backend/tests/contract/health.test.ts` for ready, unavailable, unauthenticated, and secret-redaction responses defined in `specs/015-public-deployment/contracts/deployment-contract.md`.
- [X] T006 [P] Update `backend/src/server.ts` to bind the HTTP and Socket.IO server to `0.0.0.0` using the provider-supplied `PORT`, while preserving the existing session middleware and multiplayer registration.
- [X] T007 [P] Harden production configuration validation in `backend/src/app.ts` or a new `backend/src/config.ts` so production cannot silently use `dev-secret-change-me`, localhost origins, wildcard credentialed CORS, or missing `DATABASE_URL`.
- [X] T008 [P] Add frontend production-origin validation in `frontend/src/services/apiClient.ts` and `frontend/src/services/multiplayerSocket.ts` so `VITE_API_BASE_URL` is explicit for production while localhost remains available only for development.
- [ ] T009 Run backend and frontend build/lint/test commands from `specs/015-public-deployment/quickstart.md` after foundational changes and record any baseline warnings without weakening existing security or privacy tests.

**Checkpoint**: The application has a safe readiness contract, provider-compatible binding, explicit production origins/secrets, and passing local regression checks before story-specific deployment work begins.

---

## Phase 3: User Story 1 - Access the platform from the internet (Priority: P1) 🎯 MVP

**Goal**: Deploy the application to Render and make one stable public HTTPS frontend URL serve the login experience and backend health endpoint.

**Independent Test**: From a network outside the development computer, open the assigned frontend URL, confirm HTTPS entry-screen access, call the backend `/health` URL, and verify a degraded response is clear when the backend is unavailable.

### Implementation for User Story 1

- [X] T010 [P] [US1] Configure the Render frontend Static Site in `render.yaml` with root directory `frontend`, build command `npm ci && npm run build`, publish directory `dist`, client-route fallback behavior, and the backend URL exposed to the Vite build through `VITE_API_BASE_URL`.
- [X] T011 [P] [US1] Configure the Render backend Web Service in `render.yaml` with root directory `backend`, build command `npm ci && npm run prisma:generate && npm run build`, provider `PORT` binding, health check path `/health`, and start command `npm start` after the controlled migration step.
- [X] T012 [US1] Configure the Render PostgreSQL resource and backend connection in `render.yaml` or the documented dashboard flow, ensuring `DATABASE_URL` is injected through provider-managed secrets and the database uses the same region as the backend.
- [X] T013 [US1] Configure production environment values in `render.yaml` and `specs/015-public-deployment/quickstart.md` for `NODE_ENV=production`, `SESSION_SECRET`, `FRONTEND_ORIGIN`, `VITE_API_BASE_URL`, `DATABASE_URL`, and provider-supplied `PORT`, with no secret literals committed.
- [ ] T014 [US1] Verify the first Render release using `specs/015-public-deployment/quickstart.md`: frontend HTTPS entry screen, backend `GET /health`, client-side route fallback, and clear unavailable behavior when a dependency fails.

**Checkpoint**: A user outside the development network can open the public URL and reach a healthy application entry point without running local services.

---

## Phase 4: User Story 2 - Use authenticated and multiplayer features remotely (Priority: P1)

**Goal**: Preserve sessions, persistence, CORS, Socket.IO, server acknowledgements, and private-information boundaries through the public deployment.

**Independent Test**: Use two authorized browser sessions through the public frontend URL to register or log in, join a room, observe synchronized state, complete one server-confirmed action or training update, reload, and verify privacy boundaries.

### Tests for User Story 2

- [ ] T015 [P] [US2] Add public-origin integration coverage in `backend/tests/integration/public-deployment.test.ts` for credentialed login, protected navigation, exact-origin CORS, rejected origin behavior, and session persistence against the configured backend app.
- [ ] T016 [P] [US2] Add Socket.IO deployment regression coverage in `backend/tests/integration/public-multiplayer.test.ts` for authenticated connection, room/table or training join, server acknowledgement, reconnect, and disconnected-state behavior without exposing unauthorized private data.

### Implementation for User Story 2

- [ ] T017 [US2] Validate production cookie, CORS, and session behavior in `backend/src/app.ts` and `backend/src/server.ts`: secure cookies under HTTPS, exact `FRONTEND_ORIGIN`, credentialed requests, and the same session middleware on HTTP and Socket.IO.
- [ ] T018 [US2] Verify and adjust `frontend/src/services/apiClient.ts` and `frontend/src/services/multiplayerSocket.ts` so API requests and Socket.IO use the public backend origin with credentials and retain explicit loading, failed-action, reconnecting, and disconnected states.
- [ ] T019 [US2] Run the two-browser public room/table/training smoke flow from `specs/015-public-deployment/quickstart.md`, confirming state changes occur only after server acknowledgement and private cards/training feedback remain scoped to the authorized user.
- [ ] T020 [US2] Confirm database persistence and controlled Prisma migrations through `backend/package.json`, `backend/src/db/prisma/`, and the Render release configuration; verify users, sessions, rooms, and supported history survive a backend restart.

**Checkpoint**: Authenticated and multiplayer workflows work remotely with unchanged server authority, persistence, authorization, and privacy behavior.

---

## Phase 5: User Story 3 - Operate and recover the public service (Priority: P2)

**Goal**: Make deployment health, diagnostics, migration failures, rollback, and restart recovery repeatable for the owner.

**Independent Test**: Follow the documented recovery flow, inspect service status/logs for a simulated failure, restore the last healthy release, and verify `/health`, authentication, persistence, and one multiplayer smoke action.

### Implementation for User Story 3

- [ ] T021 [P] [US3] Document Render service settings, environment variables, build/start commands, health checks, migration order, logs, region, plan limitations, and public URL recording in `specs/015-public-deployment/quickstart.md` and `README.md`.
- [ ] T022 [P] [US3] Add safe operational logging and redaction guidance in `backend/src/app.ts`, `backend/src/server.ts`, and `specs/015-public-deployment/contracts/deployment-contract.md`, ensuring secrets, cookies, database URLs, private cards, and private training feedback are never logged.
- [ ] T023 [US3] Define and validate release rollback and restart recovery in `specs/015-public-deployment/quickstart.md`, including failed migration handling, last-known-healthy release selection, `/health` verification, and persistent-data verification.
- [ ] T024 [US3] Execute the operational failure checks from `specs/015-public-deployment/quickstart.md` for backend/database unavailability, origin mismatch, interrupted Socket.IO connection, and failed release; record unresolved provider limitations without marking the feature complete.

**Checkpoint**: The owner can diagnose and recover the public service using documented Render controls without changing poker logic or persisted domain data.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final security, documentation, and regression validation across all stories.

- [ ] T025 [P] Review `git diff` and deployment files for committed secrets, localhost-only production defaults, wildcard credentialed CORS, private-data logging, and accidental changes to poker authority or privacy boundaries.
- [ ] T026 Run the complete backend and frontend validation commands from `specs/015-public-deployment/quickstart.md`, including builds, lint, unit/contract/integration tests, health checks, and the documented remote smoke flow.
- [ ] T027 [P] Update `specs/015-public-deployment/quickstart.md` with the final frontend URL, backend URL, deployment revision, database service name, verification timestamp, and known Render plan limitations, excluding all secrets.
- [ ] T028 Mark only verified acceptance criteria and tasks complete in `specs/015-public-deployment/tasks.md`; report any provider account, billing, DNS, WebSocket, or availability limitation that prevents final acceptance.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; creates Render configuration and documentation surfaces.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories because health, binding, production configuration, and local regression checks must exist first.
- **User Story 1 (Phase 3)**: Depends on T004-T009; delivers the MVP public URL and health verification.
- **User Story 2 (Phase 4)**: Depends on the public services from User Story 1 and the foundational runtime/security work; it can begin once the first healthy deployment exists.
- **User Story 3 (Phase 5)**: Depends on the deployed services and can run partly in parallel with User Story 2 after the first public release.
- **Polish (Phase 6)**: Depends on all desired stories and the real Render environment being available.

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Setup and Foundational; recommended MVP.
- **User Story 2 (P1)**: Depends on User Story 1's public URLs and health state, then remains independently testable through remote browser sessions.
- **User Story 3 (P2)**: Depends on a deployed release from User Story 1; operational checks can proceed alongside User Story 2.

### Within Each User Story

- Configuration and health contracts precede public deployment.
- The first healthy public release precedes authenticated/multiplayer smoke validation.
- Automated integration checks precede declaring remote workflow acceptance.
- Recovery and documentation checks follow a deployed release and its observable logs/status.

### Parallel Opportunities

- T001-T003 can run in parallel because they target separate deployment/documentation files.
- T005-T008 can run in parallel after the health contract shape is agreed; T009 follows them.
- T010-T013 can run in parallel in the deployment configuration/documentation surfaces, then T014 validates the assembled release.
- T015-T016 can run in parallel because they target separate integration test files.
- T021-T022 can run in parallel because they target operational documentation and logging guidance; T023-T024 depend on a deployed release.
- T025 and T027 can run in parallel with final validation, while T026 and T028 are final sequential checks.

## Parallel Example: User Story 1

```text
Task: "Configure the Render frontend Static Site in render.yaml"
Task: "Configure the Render backend Web Service in render.yaml"
Task: "Configure the Render PostgreSQL resource and backend connection"
Task: "Document production environment values in the Feature 015 quickstart"
```

## Parallel Example: User Story 2

```text
Task: "Add public-origin integration coverage in backend/tests/integration/public-deployment.test.ts"
Task: "Add Socket.IO deployment regression coverage in backend/tests/integration/public-multiplayer.test.ts"
```

## Parallel Example: User Story 3

```text
Task: "Document Render service settings and recovery inputs"
Task: "Add safe operational logging and redaction guidance"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001-T003 to establish Render configuration and documentation.
2. Complete T004-T009 to establish health, provider binding, production configuration, and local regression validation.
3. Complete T010-T014 to deploy the frontend/backend/database and verify the public HTTPS entry point.
4. Stop and validate the public URL from an external network before expanding scope.

### Incremental Delivery

1. Deliver Setup + Foundational and verify local builds/tests.
2. Deliver User Story 1 and obtain the first public URL.
3. Deliver User Story 2 and verify remote authentication, persistence, multiplayer, and privacy.
4. Deliver User Story 3 and verify recovery, diagnostics, and operational documentation.
5. Complete Polish only after the real provider environment has been smoke-tested.

## Notes

- `[P]` means the task can run in parallel with other tasks in its phase without depending on incomplete work in the same files.
- `[US1]`, `[US2]`, and `[US3]` map directly to the user stories in `specs/015-public-deployment/spec.md`.
- Render account access, provider billing/plan limits, repository connection, and external-network testing are prerequisites that cannot be simulated by local unit tests.
- No task changes poker rules, equity calculations, strategy evaluation, private-card projection, or server-authoritative action handling.
