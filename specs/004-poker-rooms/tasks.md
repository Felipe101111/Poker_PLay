# Tasks: Poker Rooms

**Input**: Design documents from `/specs/004-poker-rooms/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rooms-api.md, quickstart.md

**Tests**: Included because the constitution requires automated tests for authorization, data integrity, concurrency, and edge cases, and the feature specification defines independently testable acceptance scenarios.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated as an incremental product slice.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the schema, module registration, shared errors, and reusable test setup required by all room stories.

- [X] T001 [P] Add room-related error codes to `backend/src/shared/errors.ts`, including `ROOM_NOT_FOUND`, `ROOM_FULL`, `ROOM_STARTED`, `ROOM_CLOSED`, `NOT_ROOM_HOST`, `NOT_ROOM_MEMBER`, `ACTIVE_ROOM_EXISTS`, `ALREADY_ROOM_MEMBER`, `INVITATION_NOT_FOUND`, `INVITATION_EXISTS`, `NOT_INVITATION_RECIPIENT`, `MUST_BE_FRIEND`, `NOT_ENOUGH_PLAYERS`, and `MEMBERS_NOT_READY`.
- [X] T002 Add `PokerRoom`, `RoomMember`, and `RoomInvitation` models plus `RoomVisibility`, `RoomStatus`, and `RoomInvitationStatus` enums to `backend/src/db/prisma/schema.prisma`, preserving the exact constraints from `data-model.md`: room name 1-100 characters, seat limit 2-9, minimum players 2 through seat limit, unique `(roomId, userId)`, unique `(roomId, seatNumber)`, unique active `userId`, and cascade cleanup for room-owned records.
- [X] T003 Generate and apply the feature 004 Prisma migration from `backend/src/db/prisma/schema.prisma` and verify the migration preserves existing `User` and `FriendRequest` data.
- [X] T004 [P] Create the rooms module directory and type boundaries in `backend/src/modules/rooms/rooms.types.ts`, including request DTOs, room/member/invitation response shapes, lifecycle enums, and service result types without importing frontend or Poker Engine code.
- [X] T005 [P] Register the rooms router from `backend/src/app.ts` under `/api/rooms` behind the existing application error handler and authentication middleware boundary.
- [X] T006 [P] Add room test factories and authenticated-agent helpers in `backend/tests/helpers/roomsTest.ts` for creating users, accepted friendships, rooms, and session agents without duplicating setup across story tests.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared validation, authorization, transaction, serialization, and test utilities before story-specific behavior.

- [X] T007 [P] Implement create-room, join-room, readiness, invitation, and identifier validation schemas in `backend/src/modules/rooms/rooms.validation.ts`, trimming names, rejecting control characters, enforcing 2-9 seats, requiring minimum players from 2 through seat limit, requiring positive stack/blinds, and requiring `bigBlind > smallBlind`.
- [X] T008 Implement shared room lookup, member lookup, host authorization, private-room visibility, and stable error mapping helpers in `backend/src/modules/rooms/rooms.service.ts` for `ROOM_NOT_FOUND`, `NOT_ROOM_HOST`, `NOT_ROOM_MEMBER`, and unauthorized private-room access.
- [X] T009 Implement room response serializers in `backend/src/modules/rooms/rooms.service.ts` that expose public summaries separately from authorized full rosters and never disclose private-room membership to unauthorized users.
- [X] T010 [P] Add unit tests for room validation and private-room redaction in `backend/tests/unit/rooms/rooms.validation.test.ts` and `backend/tests/unit/rooms/rooms.serialization.test.ts`.
- [X] T011 [P] Add a transaction/error test helper in `backend/tests/helpers/roomsTest.ts` that can assert no partial membership, seat, invitation, or host changes remain after a failed operation.

**Checkpoint**: Shared schema, validation, authorization helpers, response redaction, router registration, and test infrastructure are ready; user-story work can proceed.

## Phase 3: User Story 1 - Create a Poker Room (Priority: P1) 🎯 MVP

**Goal**: An authenticated user can create one valid public or private waiting room with themselves as host and first seated member.

**Independent Test**: Register and authenticate one user, create a valid room, verify its configuration, `WAITING` state, host membership, seat 1 assignment, and validation/unauthenticated failures without starting gameplay.

### Tests for User Story 1

- [X] T012 [P] [US1] Add contract tests for `POST /api/rooms` in `backend/tests/contract/rooms.create.test.ts`, covering `201` creation, host/member response, invalid room settings (`400 VALIDATION_ERROR`), unauthenticated access (`401`), and a second active-room attempt (`409 ACTIVE_ROOM_EXISTS`).
- [X] T013 [P] [US1] Add an integration test for concurrent room creation in `backend/tests/integration/rooms.create-race.test.ts`, proving one user cannot create two active waiting rooms and failed creation leaves no partial records.

### Implementation for User Story 1

- [X] T014 [US1] Implement `createRoom` in `backend/src/modules/rooms/rooms.service.ts` to validate one active membership/host room, create `WAITING` `PokerRoom`, assign the creator to seat 1 with `ready=false`, and commit all records atomically.
- [X] T015 [US1] Implement `POST /api/rooms` in `backend/src/modules/rooms/rooms.routes.ts` using `requireAuth`, `rooms.validation.ts`, `createRoom`, and the standard `{ error: { code, message } }` envelope.
- [X] T016 [US1] Add room creation API types and form state to `frontend/src/services/roomsApi.ts` and `frontend/src/pages/RoomsPage.tsx`, allowing name, public/private visibility, seat limit, minimum players, starting stack, and blind values to be submitted.
- [X] T017 [US1] Render the created waiting-room summary and creator membership in `frontend/src/pages/RoomsPage.tsx`, including validation and unauthenticated error states without presenting the frontend as the authority for room rules.

**Checkpoint**: User Story 1 is independently usable as the MVP: authenticated users can create and inspect a valid waiting room.

## Phase 4: User Story 2 - Find and Join an Available Room (Priority: P1)

**Goal**: Authenticated users can discover public waiting rooms and atomically claim an eligible seat, while private-room access remains protected.

**Independent Test**: Use multiple authenticated users to list public waiting rooms, join an open room, verify a unique seat and membership, and prove full, started, closed, duplicate, private, and competing-seat joins are rejected without state corruption.

### Tests for User Story 2

- [X] T018 [P] [US2] Add contract tests for `GET /api/rooms`, `GET /api/rooms/:roomId`, and `POST /api/rooms/:roomId/join` in `backend/tests/contract/rooms.join.test.ts`, covering public summaries, authorized rosters, private-room `404 ROOM_NOT_FOUND`, successful join, `ROOM_FULL`, `ROOM_STARTED`, `ROOM_CLOSED`, `ACTIVE_ROOM_EXISTS`, and `ALREADY_ROOM_MEMBER`.
- [X] T019 [P] [US2] Add a concurrent final-seat integration test in `backend/tests/integration/rooms.join-race.test.ts`, proving exactly one of two competing users receives the final `(roomId, seatNumber)` and the losing request returns a stable conflict without duplicate membership.

### Implementation for User Story 2

- [X] T020 [US2] Implement `listPublicRooms` and `getRoomForViewer` in `backend/src/modules/rooms/rooms.service.ts`, returning only public `WAITING` summaries to discovery callers and full private rosters only to members, hosts, or valid invitees.
- [X] T021 [US2] Implement transactional `joinRoom` in `backend/src/modules/rooms/rooms.service.ts`, selecting the lowest available seat, enforcing `WAITING` status, capacity, one active `userId`, invitation requirements for private rooms, unique constraints, and race-safe error translation.
- [X] T022 [US2] Add `GET /api/rooms`, `GET /api/rooms/:roomId`, and `POST /api/rooms/:roomId/join` handlers in `backend/src/modules/rooms/rooms.routes.ts` with request validation and authorized response serialization.
- [X] T023 [US2] Add discovery, room-detail, join, and conflict methods to `frontend/src/services/roomsApi.ts` and connect them to room list/detail/join states in `frontend/src/pages/RoomsPage.tsx`.
- [X] T024 [US2] Display public room summaries, available seats, membership state, join errors, loading state, and empty-room state in `frontend/src/pages/RoomsPage.tsx` without exposing private-room data.

**Checkpoint**: User Stories 1 and 2 are independently demonstrable: users can create, discover, and join safe waiting rooms.

## Phase 5: User Story 3 - Invite Friends and Manage Membership (Priority: P2)

**Goal**: Hosts can invite accepted friends to private rooms, members can view their roster and leave, and host ownership transfers deterministically.

**Independent Test**: Create an accepted friendship, invite the friend, accept/decline the invitation, verify private roster authorization, leave the waiting room, and verify host transfer or closure.

### Tests for User Story 3

- [X] T025 [P] [US3] Add contract tests for invitation listing, creation, acceptance, and decline in `backend/tests/contract/rooms.invitations.test.ts`, covering accepted friends, self/non-friend rejection, duplicate invitations, recipient authorization, full/closed/started room conflicts, and invitation state transitions.
- [X] T026 [P] [US3] Add contract tests for leave and host transfer in `backend/tests/contract/rooms.membership.test.ts`, covering member-only leave, host transfer to earliest `joinedAt`, last-member closure, non-member rejection, and started-room leave rejection.
- [X] T027 [P] [US3] Add integration tests for invitation acceptance versus the final available seat in `backend/tests/integration/rooms.invitation-race.test.ts`, proving membership and invitation status change atomically or neither changes.

### Implementation for User Story 3

- [X] T028 [US3] Implement accepted-friend verification and `createInvitation` in `backend/src/modules/rooms/rooms.service.ts`, rejecting self-invites, non-existent users, non-friends, duplicate `(roomId, toUserId)` records, and unavailable rooms.
- [X] T029 [US3] Implement invitation list, accept, and decline operations in `backend/src/modules/rooms/rooms.service.ts`; acceptance must claim a seat and mark `PENDING -> ACCEPTED` in one transaction, while decline performs `PENDING -> DECLINED` only for the recipient.
- [X] T030 [US3] Implement `leaveRoom` in `backend/src/modules/rooms/rooms.service.ts`, deleting a waiting member, releasing their seat, transferring host to the earliest remaining `joinedAt`, or closing an empty room atomically.
- [X] T031 [US3] Add invitation and membership routes in `backend/src/modules/rooms/rooms.routes.ts`: `POST /:roomId/invitations`, `GET /invitations`, `POST /invitations/:invitationId/accept`, `POST /invitations/:invitationId/decline`, and `POST /:roomId/leave`.
- [X] T032 [US3] Add invitation and leave methods to `frontend/src/services/roomsApi.ts` and render host-only friend invitations, recipient invitation actions, roster membership, and leave controls in `frontend/src/pages/RoomsPage.tsx`.

**Checkpoint**: Private-room invitations, authorized rosters, member departure, host transfer, and empty-room closure are independently testable.

## Phase 6: User Story 4 - Prepare and Close a Room (Priority: P2)

**Goal**: Members manage readiness and the host can start or close a waiting room with fixed final configuration and roster.

**Independent Test**: Change readiness as each member, verify insufficient-player and not-ready failures, start a valid room as host, close another waiting room, and prove non-hosts cannot perform lifecycle controls.

### Tests for User Story 4

- [X] T033 [P] [US4] Add contract tests for readiness, start, and close in `backend/tests/contract/rooms.lifecycle.test.ts`, covering member-only readiness, `NOT_ENOUGH_PLAYERS`, `MEMBERS_NOT_READY`, successful `STARTED`, host-only close, `ROOM_STARTED`, `ROOM_CLOSED`, and invitation invalidation.
- [X] T034 [P] [US4] Add integration tests for lifecycle consistency in `backend/tests/integration/rooms.lifecycle.test.ts`, proving configuration and roster are immutable after start and failed lifecycle operations leave all records unchanged.
- [X] T035 [P] [US4] Add presence cleanup tests in `backend/tests/unit/rooms/rooms.presence.test.ts`, proving active sessions or recent `lastSeenAt` retain seats, while inactive members older than 15 minutes are released only from `WAITING` rooms.

### Implementation for User Story 4

- [X] T036 [US4] Implement `setReadiness` in `backend/src/modules/rooms/rooms.service.ts`, allowing only a member to change their own `ready` state while `WAITING` and refreshing `lastSeenAt`.
- [X] T037 [US4] Implement `startRoom` and `closeRoom` in `backend/src/modules/rooms/rooms.service.ts`, requiring host authorization, at least `minPlayers`, all current members ready, `WAITING` status, atomic invitation invalidation, and immutable final roster/configuration.
- [X] T038 [US4] Implement `cleanupStaleWaitingMembers` in `backend/src/modules/rooms/rooms.service.ts` using the documented 15-minute inactivity timeout and active-session check, preserving every `STARTED` roster.
- [X] T039 [US4] Add `PATCH /:roomId/readiness`, `POST /:roomId/start`, and `DELETE /:roomId` handlers in `backend/src/modules/rooms/rooms.routes.ts` with stable authorization and lifecycle errors.
- [X] T040 [US4] Add readiness, start, close, and stale-presence API methods to `frontend/src/services/roomsApi.ts` and render member readiness, host controls, lifecycle status, and non-joinable started/closed states in `frontend/src/pages/RoomsPage.tsx`.

**Checkpoint**: All four user stories are independently testable, and a started room is ready for a future multiplayer gameplay feature without starting a hand here.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify security, documentation, integration, and regression safety across the complete feature.

- [X] T041 [P] Add focused unit coverage for room state transitions, error mapping, name normalization, blind validation, and invitation terminal states in `backend/tests/unit/rooms/rooms.service.test.ts`.
- [X] T042 [P] Add frontend component tests for create, list, join, invite, readiness, leave, and host-control states in `frontend/tests/rooms-page.test.tsx`.
- [X] T043 Review `backend/src/modules/rooms/rooms.routes.ts` and `backend/src/modules/rooms/rooms.service.ts` for server-side revalidation, private-room information leakage, stable errors, transaction boundaries, and absence of Poker Engine dependencies.
- [X] T044 Update `backend/README.md` and `README.md` with the room module boundary, endpoint summary, lifecycle states, 15-minute presence rule, and explicit no-gameplay/no-WebSocket scope.
- [X] T045 Run the complete backend suite and build from `backend/package.json`, then run the frontend build and available tests from `frontend/package.json`; record the results against `specs/004-poker-rooms/quickstart.md`.
- [X] T046 Verify the Prisma migration and existing authentication/friends/poker-engine suites remain green after room schema and route registration changes in `backend/tests/`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies; establish schema, module registration, shared errors, and test helpers.
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all user-story work.
- **Phase 3 (US1)**: Depends on Phase 2; delivers the MVP room-creation slice.
- **Phase 4 (US2)**: Depends on Phase 2 and the room serialization/schema from US1; extends the MVP with discovery and joining.
- **Phase 5 (US3)**: Depends on US2 membership and friendship integration; adds invitations and departure/host transfer.
- **Phase 6 (US4)**: Depends on US3 membership/invitation behavior; adds readiness and lifecycle locking.
- **Phase 7 (Polish)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2; no dependency on another user story.
- **US2 (P1)**: Depends on shared room persistence and US1's room response shape; independently validates public discovery and joining.
- **US3 (P2)**: Depends on US2's membership and seat allocation; reuses feature 002 accepted-friend state.
- **US4 (P2)**: Depends on US3's membership and invitation invalidation; locks the final roster for future gameplay.

### Parallel Opportunities

- T001, T004, T005, and T006 can run in parallel after setup begins because they touch separate shared surfaces.
- T007, T010, and T011 can run in parallel after the foundational module boundary exists.
- Within each story, contract tests and integration tests marked `[P]` can be authored in parallel with each other before implementation.
- T020/T021 and T023 can be developed in parallel after the response model is agreed; route work follows service contracts.
- T028/T029 and frontend invitation work can proceed in parallel after the invitation schema exists.
- T036/T037/T038 and their focused tests can be developed in parallel because they own separate service functions and test files.
- T041, T042, T043, and T044 are parallel polish tasks after story completion.

## Parallel Example: User Story 1

```text
Task: "T012 [US1] Contract tests in backend/tests/contract/rooms.create.test.ts"
Task: "T013 [US1] Concurrent creation test in backend/tests/integration/rooms.create-race.test.ts"
Task: "T016 [US1] Room API and form in frontend/src/services/roomsApi.ts and frontend/src/pages/RoomsPage.tsx"
```

## Parallel Example: User Story 2

```text
Task: "T018 [US2] Discovery and join contract tests in backend/tests/contract/rooms.join.test.ts"
Task: "T019 [US2] Final-seat race test in backend/tests/integration/rooms.join-race.test.ts"
Task: "T023 [US2] Discovery and join client methods in frontend/src/services/roomsApi.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundational validation, serialization, and authorization.
3. Complete Phase 3 User Story 1.
4. Run the US1 contract and integration tests plus the backend build.
5. Stop for review/demo before adding discovery or multiplayer preparation.

### Incremental Delivery

1. Add US2 to make rooms discoverable and joinable.
2. Add US3 for private invitations, leave, and host transfer.
3. Add US4 for readiness and lifecycle locking.
4. Run the full quickstart and regression suite.
5. Keep poker-hand execution, WebSockets, and reconnect synchronization for the next feature.

## Notes

- Every task uses the required checklist format: checkbox, sequential ID, optional `[P]`, required story label in story phases, and an exact file path.
- The 15-minute inactivity policy is the planning decision used for the unanswered clarification from the preceding clarification session.
- Tasks are intentionally scoped to room/lobby behavior and do not modify the independent Poker Engine rules.
