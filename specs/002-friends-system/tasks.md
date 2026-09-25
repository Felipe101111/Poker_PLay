---

description: "Task list template for feature implementation"
---

# Tasks: Friends System

**Input**: Design documents from `/specs/002-friends-system/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/friends-api.md, quickstart.md

**Tests**: Included — Constitution Principle 26 mandates automated tests for critical logic, and this feature governs authorization-sensitive social-graph mutations (Principles 22/23).

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths are included in every description

## Path Conventions

Extends the existing web app split from feature 001: `backend/src/`, `backend/tests/`, `frontend/src/`, `frontend/tests/`. No new top-level projects.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: New module scaffolding only — no new dependencies (research.md confirms feature 001's stack is reused as-is)

- [X] T001 Create the backend module skeleton: `backend/src/modules/friends/friends.routes.ts`, `friends.service.ts`, `friends.repository.ts`, `friends.validation.ts` (empty stubs) per plan.md Project Structure
- [X] T002 [P] Ensure `backend/tests/contract/` and `backend/tests/integration/` are ready for the new friends test files (reuse feature 001's `vitest.config.ts` — no new config needed)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Add the `FriendRequest` model to `backend/src/db/prisma/schema.prisma`: `id` (UUID PK), `senderId`/`receiverId`/`userLowId`/`userHighId` (FK → `User.id`), `status` (enum `PENDING` | `ACCEPTED` — no `REJECTED`/`CANCELLED`/`REMOVED` values per data-model.md), `createdAt`, `updatedAt`; add a unique constraint on (`userLowId`, `userHighId`) per data-model.md
- [X] T004 Generate and apply the Prisma migration adding the `friend_requests` table (`backend/src/db/prisma/migrations/`)
- [X] T005 [P] Export `isUserOnline(userId: string): Promise<boolean>` from `backend/src/modules/auth/session-presence.ts`, querying `connect-pg-simple`'s `session` table for a non-expired row referencing that `userId` (FR-013, research.md)
- [X] T006 [P] Implement the pair-normalization helper `normalizePair(userIdA, userIdB): { userLowId, userHighId }` (sorts the two IDs lexicographically) in `backend/src/modules/friends/friends.repository.ts`
- [X] T007 [P] Implement `zod` schemas for search (`query`: non-empty string) and send-request (`receiverId`: UUID) in `backend/src/modules/friends/friends.validation.ts`
- [X] T008 [P] Wire an (initially empty) `friendsRouter` into `backend/src/app.ts` at `/api/friends`, behind the existing `requireAuth` guard from feature 001
- [X] T009 [P] Add the friends API client base (`search`, `sendRequest`, `listRequests`, `accept`, `reject`, `cancelRequest`, `listFriends`, `removeFriend` functions) in `frontend/src/services/friendsApi.ts`, built on feature 001's `apiClient`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Send a friend request (Priority: P1) 🎯 MVP

**Goal**: An authenticated user can search another user by username and send them a friend request (FR-001–FR-006).

**Independent Test**: Search returns matching usernames (excluding self); sending a request creates a `PENDING` row; a duplicate/self/already-friends attempt is rejected; a simultaneous reverse-direction request auto-accepts instead of conflicting (FR-006).

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T010 [P] [US1] Contract test for `GET /api/friends/search` (matches, excludes the caller, `400` on empty query) per contracts/friends-api.md in `backend/tests/contract/friends.search.test.ts`
- [X] T011 [P] [US1] Contract test for `POST /api/friends/requests` (`201` new pending, `400` self-request, `404` unknown receiver, `409` duplicate/already-friends) in `backend/tests/contract/friends.request.test.ts`
- [X] T012 [P] [US1] Integration test: A sends a request to B, then B independently sends a request to A before answering — the second call resolves to a single `ACCEPTED` row, not a new row or a conflict (FR-006) — in `backend/tests/integration/friends.mutual-race.test.ts`

### Implementation for User Story 1

- [X] T013 [US1] Implement `FriendsRepository.searchUsersByUsername(query, excludeUserId)` (case-insensitive `contains` match, per research.md) in `backend/src/modules/friends/friends.repository.ts` (depends on T006)
- [X] T014 [US1] Implement `FriendsRepository.findByPair(userA, userB)` and `.create(senderId, receiverId)`, using the normalized pair key and catching the unique-constraint violation as the signal to re-fetch and decide accept-vs-conflict (FR-006) in `backend/src/modules/friends/friends.repository.ts` (depends on T003, T004, T006)
- [X] T015 [US1] Implement `FriendsService.search()` and `.sendRequest()` — reject self-requests (FR-004), reject an existing `PENDING`(same direction)/`ACCEPTED` pair (FR-005), auto-accept a detected reverse-direction `PENDING` row (FR-006) — in `backend/src/modules/friends/friends.service.ts` (depends on T013, T014, T007)
- [X] T016 [US1] Implement the `GET /api/friends/search` and `POST /api/friends/requests` routes in `backend/src/modules/friends/friends.routes.ts` (depends on T015, T008)
- [X] T017 [P] [US1] Build the search + send-request section of `FriendsPage` in `frontend/src/pages/FriendsPage.tsx` (depends on T009)

**Checkpoint**: At this point, User Story 1 (search + send) is fully functional and testable independently

---

## Phase 4: User Story 2 - Respond to a friend request (Priority: P1)

**Goal**: The receiver of a `PENDING` request can accept or reject it (FR-007–FR-009).

**Independent Test**: A pending request appears in the receiver's incoming list; the receiver accepting it makes both users friends; the receiver rejecting it removes the request without creating a friendship; only the receiver (not the sender or anyone else) may act on it.

### Tests for User Story 2 ⚠️

- [X] T018 [P] [US2] Contract test for `GET /api/friends/requests` (correct `incoming`/`outgoing` split) per contracts/friends-api.md in `backend/tests/contract/friends.requests-list.test.ts`
- [X] T019 [P] [US2] Contract test for accept/reject (`200` success for the receiver, `401`/`403` for the sender or a third user, `404` for a non-existent/already-resolved request) in `backend/tests/contract/friends.respond.test.ts`

### Implementation for User Story 2

- [X] T020 [US2] Implement `FriendsRepository.findPendingById(id)`, `.accept(id)`, and `.reject(id)` (reject deletes the row — no `REJECTED` status persisted, per data-model.md) in `backend/src/modules/friends/friends.repository.ts` (depends on T014)
- [X] T021 [US2] Implement `FriendsService.listRequests()`, `.accept()`, `.reject()` — enforcing that only the request's `receiverId` may accept/reject (FR-007) — in `backend/src/modules/friends/friends.service.ts` (depends on T020)
- [X] T022 [US2] Implement `GET /api/friends/requests`, `POST /api/friends/requests/:id/accept`, and `POST /api/friends/requests/:id/reject` routes in `backend/src/modules/friends/friends.routes.ts` (depends on T021)
- [X] T023 [P] [US2] Build the incoming/outgoing requests section (with accept/reject actions) in `frontend/src/pages/FriendsPage.tsx` (depends on T017)

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently (send a request, then respond to it)

---

## Phase 5: User Story 3 - View my friends list (Priority: P2)

**Goal**: An authenticated user can view their accepted friends with an online/offline indicator (FR-012, FR-013).

**Independent Test**: After two users become friends, each sees the other in their friends list with `online: true` while the other has an active session, and `online: false` after that session ends.

### Tests for User Story 3 ⚠️

- [X] T024 [P] [US3] Contract test for `GET /api/friends` (`200`, includes `id`/`username`/`online`, never `email`) per contracts/friends-api.md in `backend/tests/contract/friends.list.test.ts`
- [X] T025 [P] [US3] Integration test: a friend shows `online: true` while logged in and `online: false` after `POST /api/auth/logout` (FR-013) in `backend/tests/integration/friends.online-status.test.ts`

### Implementation for User Story 3

- [X] T026 [US3] Implement `FriendsRepository.listFriends(userId)` — all `ACCEPTED` rows where the user is `userLowId` or `userHighId`, returning the *other* user — in `backend/src/modules/friends/friends.repository.ts` (depends on T003, T004)
- [X] T027 [US3] Implement `FriendsService.listFriends()`, combining repository results with `isUserOnline()` from `modules/auth` (depends on T005, T026)
- [X] T028 [US3] Implement the `GET /api/friends` route in `backend/src/modules/friends/friends.routes.ts` (depends on T027)
- [X] T029 [P] [US3] Build the friends-list section (username + online indicator) in `frontend/src/pages/FriendsPage.tsx` (depends on T017)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 are all independently functional

---

## Phase 6: User Story 4 - Remove a friend or cancel a pending request (Priority: P3)

**Goal**: A user can cancel a request they sent, or remove an existing friendship (FR-010, FR-011).

**Independent Test**: Cancelling a still-pending sent request removes it for both sides; removing a friend ends the connection for both and either side can immediately send a new request afterward (FR-009).

### Tests for User Story 4 ⚠️

- [X] T030 [P] [US4] Contract test for `DELETE /api/friends/requests/:id` (`204` for the original sender, `401`/`403` for anyone else, `404` if not pending) per contracts/friends-api.md in `backend/tests/contract/friends.cancel.test.ts`
- [X] T031 [P] [US4] Contract test for `DELETE /api/friends/:userId` (`204` remove, idempotent on repeat) in `backend/tests/contract/friends.remove.test.ts`
- [X] T032 [P] [US4] Integration test: after removing a friend (or cancelling a request), both users can immediately send a new friend request that creates a fresh row (FR-009) in `backend/tests/integration/friends.reconnect.test.ts`

### Implementation for User Story 4

- [X] T033 [US4] Implement `FriendsRepository.cancel(id)` (sender-only, `PENDING`-only, deletes the row) and `.remove(userA, userB)` (deletes the `ACCEPTED` row) in `backend/src/modules/friends/friends.repository.ts` (depends on T014, T026)
- [X] T034 [US4] Implement `FriendsService.cancelRequest()` (enforcing sender-only, FR-010) and `.removeFriend()` in `backend/src/modules/friends/friends.service.ts` (depends on T033)
- [X] T035 [US4] Implement the `DELETE /api/friends/requests/:id` and `DELETE /api/friends/:userId` routes in `backend/src/modules/friends/friends.routes.ts` (depends on T034)
- [X] T036 [P] [US4] Add remove/cancel actions to `FriendsPage` in `frontend/src/pages/FriendsPage.tsx` (depends on T023, T029)

**Checkpoint**: All 4 user stories are independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T037 [P] Run every quickstart.md validation scenario end-to-end against a local environment and record results
- [X] T038 [P] Document the new `/api/friends/*` endpoints and the reused `isUserOnline` helper in `backend/README.md`
- [X] T039 Security review pass across all four stories: confirm no response ever includes `email`/`passwordHash` (Constitution P4), and that receiver-only/sender-only authorization (FR-007/FR-010) is enforced server-side, not just hidden in the UI (Constitution P3/P23)
- [X] T040 [P] Add a unit test for the pair-normalization helper — symmetric result regardless of argument order — in `backend/tests/unit/normalize-pair.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 and US2 are both P1; US2 (responding) needs at least one `PENDING` request to act on, which US1 creates — implement US1 first
  - US3 (list) and US4 (remove/cancel) both need an existing friendship/request from US1+US2 to be independently testable end-to-end, even though their own files are independent of one another
- **Polish (Phase 7)**: Depends on all four user stories being complete

### User Story Dependencies

- **User Story 1 (P1 — Send request)**: Can start after Foundational (Phase 2). No dependency on other stories.
- **User Story 2 (P1 — Respond)**: Can start after Foundational (Phase 2). Needs a pending request (from US1 or a test fixture) to be independently testable.
- **User Story 3 (P2 — List)**: Can start after Foundational (Phase 2). Needs an accepted friendship (from US1+US2 or a fixture) to be independently testable.
- **User Story 4 (P3 — Remove/cancel)**: Can start after Foundational (Phase 2). Needs a pending request or friendship (from US1/US2 or a fixture) to be independently testable.

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Repository before service
- Service before route
- Backend route before the frontend section that calls it
- Story complete before moving to the next priority

### Parallel Opportunities

- Setup task T002 and all Foundational tasks marked [P] (T005-T009) can run in parallel once T003/T004 land
- All [P] test tasks within a story (e.g., T010+T011+T012, T018+T019) can be written in parallel
- Frontend `FriendsPage` sections (T017, T023, T029, T036) touch the same file sequentially by story, but each story's contract/integration tests remain parallel to each other

---

## Parallel Example: User Story 1

```text
# Launch the three US1 tests together:
Task: "Contract test for GET /api/friends/search in backend/tests/contract/friends.search.test.ts"
Task: "Contract test for POST /api/friends/requests in backend/tests/contract/friends.request.test.ts"
Task: "Integration test for the mutual-request race (FR-006) in backend/tests/integration/friends.mutual-race.test.ts"

# Then, once T006 (pair normalization) exists, repository work and the frontend section can proceed in parallel:
Task: "Implement FriendsRepository.searchUsersByUsername() in backend/src/modules/friends/friends.repository.ts"
Task: "Build the search + send-request section of FriendsPage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks everything)
3. Complete Phase 3: User Story 1 (Send a friend request)
4. **STOP and VALIDATE**: Run T010-T012 and the search/send scenario from quickstart.md independently
5. This alone proves the pair-uniqueness/race-safety model (the riskiest part of this feature) works end-to-end

### Incremental Delivery

1. Add Phase 4 (Respond) → validate the full send→accept/reject loop → smallest usable product
2. Add Phase 5 (List) → validate friends appear with correct online status
3. Add Phase 6 (Remove/cancel) → validate cleanup and reconnection (FR-009)
4. Each phase adds value without breaking the previous ones — stop at any checkpoint and still have a working, demoable slice

### Suggested MVP Scope

**User Story 1 + User Story 2** (both P1) form the smallest end-to-end usable product: one user can find and request another, and that other user can accept — producing an actual friendship. User Story 1 alone proves the request/race-safety logic but has no way to demonstrate an actual friendship without User Story 2.
