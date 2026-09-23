---

description: "Task list template for feature implementation"
---

# Tasks: User Authentication (Register, Login, Profile)

**Input**: Design documents from `/specs/001-user-authentication/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-api.md, quickstart.md

**Tests**: Included — Constitution Principle 26 mandates automated tests for critical logic, and this feature is authentication (security-critical).

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent implementation and testing of each story.

**Note**: Renumbered after `/speckit-analyze` (2026-09-23) to add a dedicated CORS task (G1) and a login request-validation schema task (G2). Total 45 tasks (was 43).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths are included in every description

## Path Conventions

Web app split per plan.md: `backend/src/`, `backend/tests/`, `frontend/src/`, `frontend/tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create backend project skeleton (`backend/src/`, `backend/tests/contract/`, `backend/tests/integration/`, `backend/tests/unit/`) per plan.md Project Structure
- [X] T002 Create frontend project skeleton (`frontend/src/pages/`, `frontend/src/services/`, `frontend/src/components/`, `frontend/tests/unit/`) per plan.md Project Structure
- [X] T003 [P] Initialize backend Node 20/TypeScript project in `backend/package.json` with Express 4, Prisma, `argon2`, `express-session`, `connect-pg-simple`, `cors`, `zod`, Vitest, Supertest
- [X] T004 [P] Initialize frontend Node 20/TypeScript project in `frontend/package.json` with React 18, Vite, React Router, Vitest, React Testing Library
- [X] T005 [P] Configure ESLint + Prettier for `backend/` and `frontend/`
- [X] T006 [P] Configure Vitest projects: `backend/vitest.config.ts` and `frontend/vitest.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Define Prisma schema for `User` (`id` UUID PK, `email` unique string, `username` unique string, `passwordHash` string, `createdAt` timestamp) and `Session` (`id` opaque string PK, `userId` FK → User.id, `createdAt`, `expiresAt`) in `backend/src/db/prisma/schema.prisma`, per data-model.md field/constraint list
- [X] T008 Generate the initial Prisma migration creating the `User` and `Session` tables (`backend/src/db/prisma/migrations/`) and a `docker-compose.yml` at repo root providing local PostgreSQL 16 for running it
- [X] T009 [P] Configure the PostgreSQL connection (`DATABASE_URL` env var) and Prisma client singleton in `backend/src/db/prisma/client.ts`
- [X] T010 Set up the Express app skeleton — JSON body parsing, cookie parsing, and a centralized error handler returning the `{ "error": { "code", "message" } }` shape from contracts/auth-api.md — in `backend/src/app.ts`
- [X] T011 Configure CORS with a specific frontend origin allow-list and `credentials: true` (required for the cookie-based session to work across the frontend/backend origin split) in `backend/src/app.ts`
- [X] T012 Configure `express-session` with the `connect-pg-simple` store: opaque session id, `HttpOnly`, `SameSite=Lax` cookie, `Secure` flag enabled only outside local development (env-conditional, so the documented local HTTP quickstart flow keeps working), 7-day sliding expiration (FR-008) in `backend/src/app.ts`
- [X] T013 [P] Implement the auth guard middleware that rejects requests without a valid, non-expired session with `401 UNAUTHENTICATED` in `backend/src/modules/auth/auth.middleware.ts`
- [X] T014 [P] Implement the shared error-response helper (`{ error: { code, message } }`) in `backend/src/shared/errors.ts`
- [X] T015 [P] Set up the frontend API client base (`fetch` wrapper with `credentials: 'include'` so the session cookie is sent) in `frontend/src/services/apiClient.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Register for a new account (Priority: P1) 🎯 MVP

**Goal**: A new visitor can create an account with a username, email, and password (FR-001–FR-005, FR-012, FR-015).

**Independent Test**: `POST /api/auth/register` with a unique email/username and an 8+ character password returns `201` with no password/hash in the body; repeating the same email or (normalized) username returns `409`; a password under 8 characters returns `400`.

### Tests for User Story 1 ⚠️

- [X] T016 [P] [US1] Contract test for `POST /api/auth/register` (201/400/409 cases, no password/hash ever in response) per contracts/auth-api.md in `backend/tests/contract/auth.register.test.ts`
- [X] T017 [P] [US1] Integration test: after registering, the stored `User.passwordHash` is an Argon2id hash and never equals the submitted plaintext password, in `backend/tests/integration/register.test.ts`

### Implementation for User Story 1

- [X] T018 [P] [US1] Create the `User` repository (`create`, `findByNormalizedEmail`, `findByNormalizedUsername`) in `backend/src/modules/auth/users.repository.ts`
- [X] T019 [US1] Implement the registration request schema with `zod`: well-formed email (FR-002), username non-empty after trim, password minimum 8 characters with no forced composition rules (FR-004), in `backend/src/modules/auth/auth.validation.ts`
- [X] T020 [US1] Implement `AuthService.register()` in `backend/src/modules/auth/auth.service.ts` (depends on T018, T019): normalize (lowercase + trim) email and username for the uniqueness check (FR-003), reject with `ACCOUNT_EXISTS` if either is already taken, hash the password with Argon2id (FR-005), and create the `User` row inside a single DB transaction (Constitution Principle 24)
- [X] T021 [US1] Implement the `POST /api/auth/register` route in `backend/src/modules/auth/auth.routes.ts` (depends on T020): wire validation → service → `201` response containing only `id`, `email`, `username`, `createdAt`
- [X] T022 [P] [US1] Build `RegisterPage` (email, username, password fields, inline validation messages) calling `POST /api/auth/register` in `frontend/src/pages/RegisterPage.tsx` (depends on T015)

**Checkpoint**: At this point, User Story 1 (registration) is fully functional and testable independently

---

## Phase 4: User Story 2 - Log in to an existing account (Priority: P1)

**Goal**: A returning user authenticates with email + password and receives an authenticated session (FR-006–FR-008, FR-015, FR-017).

**Independent Test**: `POST /api/auth/login` with correct credentials returns `200` and a `Set-Cookie` session cookie; incorrect password or an unknown email both return the identical `401 INVALID_CREDENTIALS` body (SC-004).

### Tests for User Story 2 ⚠️

- [X] T023 [P] [US2] Contract test for `POST /api/auth/login` (200/401 cases; unknown-email and wrong-password responses are byte-for-byte identical) per contracts/auth-api.md in `backend/tests/contract/auth.login.test.ts`
- [X] T024 [P] [US2] Integration test: a successful login creates a `Session` row with `expiresAt` = `createdAt` + 7 days, in `backend/tests/integration/login-session.test.ts`

### Implementation for User Story 2

- [X] T025 [US2] Implement the login request schema with `zod` (email, password both required strings) in `backend/src/modules/auth/auth.validation.ts`
- [X] T026 [US2] Implement `AuthService.login()` in `backend/src/modules/auth/auth.service.ts` (depends on T018, T020): look up the user by normalized email, verify the Argon2id hash, and return the generic `INVALID_CREDENTIALS` error for both "no such email" and "wrong password" (FR-007)
- [X] T027 [US2] On successful login, create the session (opaque id, `userId`, `createdAt`, `expiresAt` = now + 7 days, FR-008) via the `express-session` store configured in T012, in `backend/src/modules/auth/auth.service.ts`
- [X] T028 [US2] Implement the `POST /api/auth/login` route in `backend/src/modules/auth/auth.routes.ts` (depends on T025, T027): wire validation → service → `200` response + session cookie
- [X] T029 [US2] Implement sliding expiration — every authenticated request through the auth guard resets its session's `expiresAt` to now + 7 days (FR-008) — in `backend/src/modules/auth/auth.middleware.ts` (depends on T013, T027)
- [X] T030 [P] [US2] Build `LoginPage` (email + password form, generic error display) calling `POST /api/auth/login` and redirecting to the profile on success, in `frontend/src/pages/LoginPage.tsx` (depends on T015)

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently (register, then come back and log in)

---

## Phase 5: User Story 3 - View and edit basic profile (Priority: P2)

**Goal**: An authenticated user can view their profile and edit their username/display name (FR-010, FR-011).

**Independent Test**: `GET /api/users/me` returns `id`, `email`, `username`, `createdAt`; `PATCH /api/users/me` with a new `username` persists it and returns it; a request body containing `id`/`email`/`createdAt` has those fields silently ignored.

### Tests for User Story 3 ⚠️

- [X] T031 [P] [US3] Contract test for `GET /api/users/me` (200/401 cases) per contracts/auth-api.md in `backend/tests/contract/users.me.get.test.ts`
- [X] T032 [P] [US3] Contract test for `PATCH /api/users/me` (200/400/401/409 cases, and that `id`/`email`/`createdAt` in the request body are ignored, not applied) in `backend/tests/contract/users.me.patch.test.ts`

### Implementation for User Story 3

- [X] T033 [US3] Implement `UsersService.getProfile()` and `UsersService.updateUsername()` in `backend/src/modules/auth/users.service.ts` (depends on T018): apply the same normalization + uniqueness rule as FR-003 when changing the username, returning `USERNAME_TAKEN` on conflict
- [X] T034 [US3] Implement the `GET /api/users/me` route (behind the T013 auth guard) in `backend/src/modules/auth/users.routes.ts` (depends on T013, T033)
- [X] T035 [US3] Implement the `PATCH /api/users/me` route in `backend/src/modules/auth/users.routes.ts` (depends on T033, T034): validate the new username, ignore any `id`/`email`/`createdAt` fields in the body, return `409 USERNAME_TAKEN` on conflict
- [X] T036 [P] [US3] Build `ProfilePage` showing `username`/`email`/`createdAt` with an editable username field calling `PATCH /api/users/me`, in `frontend/src/pages/ProfilePage.tsx` (depends on T015)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 are all independently functional

---

## Phase 6: User Story 4 - Log out of the session (Priority: P3)

**Goal**: An authenticated user can explicitly end their session (FR-009).

**Independent Test**: `POST /api/auth/logout` returns `204`; a subsequent `GET /api/users/me` using the same (now-invalid) cookie returns `401` (SC-006).

### Tests for User Story 4 ⚠️

- [X] T037 [P] [US4] Contract test for `POST /api/auth/logout` (204, idempotent when called again) per contracts/auth-api.md in `backend/tests/contract/auth.logout.test.ts`
- [X] T038 [P] [US4] Integration test: after logout, the `Session` row is deleted/invalidated and a subsequent `GET /api/users/me` with the old cookie returns `401` (SC-006), in `backend/tests/integration/logout.test.ts`

### Implementation for User Story 4

- [X] T039 [US4] Implement `AuthService.logout()` in `backend/src/modules/auth/auth.service.ts` (depends on T027): destroy the session row and clear the cookie
- [X] T040 [US4] Implement the `POST /api/auth/logout` route in `backend/src/modules/auth/auth.routes.ts` (depends on T039)
- [X] T041 [P] [US4] Add a logout action to `ProfilePage` calling `POST /api/auth/logout` and redirecting to the login page, in `frontend/src/pages/ProfilePage.tsx` (depends on T036)

**Checkpoint**: All 4 user stories are independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T042 [P] Run every quickstart.md validation scenario end-to-end against a local environment and record results
- [X] T043 [P] Document how to run `backend/` and `frontend/` locally and the required env vars (`DATABASE_URL`, session secret) in `backend/README.md`
- [X] T044 Security review pass across all four stories: confirm no response ever includes `passwordHash`/plaintext password (Constitution P4/P5) and every input is validated server-side regardless of client validation (Constitution P3)
- [X] T045 [P] Add a unit test for the email/username normalization helper (lowercase + trim) in `backend/tests/unit/normalize.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 and have no dependency on each other's implementation, but US2's login only becomes meaningful once an account exists (via US1 or a seeded test user) — implement US1 first
  - US3 (profile) and US4 (logout) both require an authenticated session, so they depend on US2's session creation (T027) being in place, even though their own files are independent of one another
- **Polish (Phase 7)**: Depends on all four user stories being complete

### User Story Dependencies

- **User Story 1 (P1 — Register)**: Can start after Foundational (Phase 2). No dependency on other stories.
- **User Story 2 (P1 — Login)**: Can start after Foundational (Phase 2). Needs at least one registered user to test against (from US1 or a test fixture).
- **User Story 3 (P2 — Profile)**: Can start after Foundational (Phase 2). Needs an authenticated session (US2) to be independently testable end-to-end.
- **User Story 4 (P3 — Logout)**: Can start after Foundational (Phase 2). Needs an authenticated session (US2) to be independently testable end-to-end.

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Repository/schema before service
- Service before route
- Backend route before the frontend page that calls it
- Story complete before moving to the next priority

### Parallel Opportunities

- All Setup tasks marked [P] (T003-T006) can run in parallel
- Within Foundational, T009, T013, T014, T015 can run in parallel once T007/T008/T010/T011/T012 land
- All [P] test tasks within a story (e.g., T016+T017, T023+T024) can be written in parallel
- Frontend page tasks (T022, T030, T036, T041) are each in their own file and can run in parallel with the backend tasks of later stories once their own story's routes exist

---

## Parallel Example: User Story 1

```text
# Launch the two US1 tests together:
Task: "Contract test for POST /api/auth/register in backend/tests/contract/auth.register.test.ts"
Task: "Integration test verifying Argon2id hashing in backend/tests/integration/register.test.ts"

# Then, once the schema (T007) exists, the repository and frontend page can proceed in parallel:
Task: "Create the User repository in backend/src/modules/auth/users.repository.ts"
Task: "Build RegisterPage in frontend/src/pages/RegisterPage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks everything)
3. Complete Phase 3: User Story 1 (Register)
4. **STOP and VALIDATE**: Run T016/T017 and the register scenario from quickstart.md independently
5. This alone proves the core identity-creation flow and secure password hashing work end-to-end

### Incremental Delivery

1. Add Phase 4 (Login) → validate registering and logging back in as the same user → smallest usable product
2. Add Phase 5 (Profile) → validate viewing/editing the username
3. Add Phase 6 (Logout) → validate session termination (SC-006)
4. Each phase adds value without breaking the previous ones — stop at any checkpoint and still have a working, demoable slice

### Suggested MVP Scope

**User Story 1 + User Story 2** (both P1) form the smallest end-to-end usable product: a visitor can create an account and come back to log into it later. User Story 1 alone is enough to validate secure account creation, but has no way to prove persistence across sessions without User Story 2.
