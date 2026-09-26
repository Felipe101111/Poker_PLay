# Feature Specification: Poker Rooms

**Feature Branch**: `004-poker-rooms`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "004" (interpreted as the next sequential roadmap feature: authenticated poker room and lobby management)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a poker room (Priority: P1)

An authenticated user creates a poker room so they can organize a table with friends or other permitted players before a game begins.

**Why this priority**: Room creation is the entry point for every hosted table and establishes the rules, ownership, and access policy that later gameplay will use.

**Independent Test**: Can be fully tested by creating rooms with valid and invalid settings, then verifying the resulting room details, host membership, and validation errors without starting a poker hand.

**Acceptance Scenarios**:

1. **Given** an authenticated user is not hosting an active room, **When** they create a room with a name, seat limit, starting stack, blind size, and visibility, **Then** the room is created in a waiting state and the creator is its host and first member.
2. **Given** a user submits a room name or numeric setting outside the allowed limits, **When** they attempt to create the room, **Then** the request is rejected with a clear validation message and no room is created.
3. **Given** an unauthenticated visitor attempts to create a room, **When** the request is submitted, **Then** the request is rejected and no room information is disclosed.

### User Story 2 - Find and join an available room (Priority: P1)

A user browses rooms they are allowed to see and joins an available room, so they can take a seat before the host starts the table.

**Why this priority**: A room has little value if intended players cannot find it or join it safely.

**Independent Test**: Can be fully tested with multiple authenticated users by creating public and private rooms, listing rooms, joining valid rooms, and verifying that capacity, membership, and access rules are enforced.

**Acceptance Scenarios**:

1. **Given** a public waiting room has an open seat, **When** an authenticated user views available rooms and joins it, **Then** the user becomes a member, receives a seat assignment, and the room member count increases by one.
2. **Given** a private room exists, **When** a user without an invitation or permission attempts to join it, **Then** the request is rejected without revealing private membership or configuration details.
3. **Given** a room has no open seats or is no longer waiting, **When** a user attempts to join it, **Then** the request is rejected and the room membership remains unchanged.
4. **Given** a user is already a member of a room, **When** they attempt to join it again, **Then** the request is rejected or treated as an idempotent read without creating a duplicate membership.

### User Story 3 - Invite friends and manage membership (Priority: P2)

A host invites accepted friends to a private room, while members can see the current roster and leave before the game begins.

**Why this priority**: Private rooms need controlled access, and clear membership actions prevent abandoned seats and confusing lobbies.

**Independent Test**: Can be fully tested by inviting an accepted friend, rejecting an ineligible invite, listing the roster from authorized and unauthorized accounts, and joining or leaving before the room starts.

**Acceptance Scenarios**:

1. **Given** a user hosts a private waiting room and has an accepted friendship with another user, **When** the host invites that friend, **Then** the friend receives a pending room invitation and can join the room through that invitation.
2. **Given** a user tries to invite themselves, a non-existent user, or a user who is not an accepted friend, **When** the invitation is submitted, **Then** it is rejected without changing room membership.
3. **Given** a member is in a waiting room, **When** they leave, **Then** their membership and seat are released and the remaining roster is updated.
4. **Given** a non-member requests the roster of a private room, **When** the request is submitted, **Then** the request is rejected without exposing member identities.

### User Story 4 - Prepare and close a room (Priority: P2)

The host sees who is present, members indicate readiness, and the host can close an unused waiting room while preserving a clear lifecycle for future gameplay.

**Why this priority**: A predictable lobby state gives users confidence about when a table is ready and prevents stale rooms from remaining indefinitely available.

**Independent Test**: Can be fully tested by changing readiness, checking host-only permissions, attempting to close rooms from different roles, and verifying that closed rooms cannot accept new members.

**Acceptance Scenarios**:

1. **Given** a member belongs to a waiting room, **When** they change their readiness state, **Then** the room roster reflects the new state and the member can change it again before the room starts.
2. **Given** a waiting room has not met its minimum player requirement, **When** the host attempts to start the table, **Then** the request is rejected and the room remains waiting.
3. **Given** a waiting room meets its minimum player requirement and all required members are ready, **When** the host starts the table, **Then** the room changes to a non-joinable started state and its final roster and configuration are fixed.
4. **Given** a waiting room exists, **When** the host closes it, **Then** the room becomes unavailable, pending invitations are invalidated, and no new member can join.
5. **Given** a non-host attempts to start or close a room, **When** the request is submitted, **Then** it is rejected without changing the room state.

### Edge Cases

- A user attempts to create or join multiple rooms beyond the one active-room membership allowed by the product; the request is rejected with a clear explanation.
- Two users attempt to claim the final open seat at the same time; only one membership succeeds and the other receives a full-room response.
- The host leaves a waiting room; ownership transfers to the longest-standing remaining member, or the room closes if no members remain.
- A room invitation is accepted after the room is full, closed, or started; it cannot create membership.
- A member's session expires while the room is waiting; the roster marks the member unavailable or releases the seat according to the room's presence policy, without silently starting the game.
- A room name contains duplicate whitespace, unsafe control characters, or only whitespace; it is normalized or rejected consistently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require authentication for room creation, room discovery, membership changes, invitations, readiness changes, and host controls.
- **FR-002**: System MUST allow an authenticated user to create exactly one active waiting room at a time, with a name, visibility, seat limit, starting stack, blind configuration, and minimum player count.
- **FR-003**: System MUST validate room names, seat limits, starting stacks, blind values, and minimum player counts against documented bounds before creating a room.
- **FR-004**: System MUST assign the creator as the room host and create one membership and seat assignment for that user.
- **FR-005**: System MUST expose public waiting rooms to authenticated users without exposing private-room membership or configuration to unauthorized users.
- **FR-006**: System MUST allow an authenticated user to join a public waiting room only when it has capacity, remains joinable, and the user is not already a member of another active room.
- **FR-007**: System MUST allow a user to join a private room only through a valid invitation or explicit host authorization.
- **FR-008**: System MUST prevent duplicate memberships, duplicate seat assignments, and membership changes after a room has started or closed.
- **FR-009**: System MUST allow a host to invite an accepted friend to a private waiting room and MUST reject self-invites, non-existent users, non-friends, duplicate pending invitations, and invitations to unavailable rooms.
- **FR-010**: System MUST allow a room member to view the roster and change their own ready state while the room is waiting.
- **FR-011**: System MUST allow a member to leave a waiting room and release their seat; leaving a started room is outside this feature's scope.
- **FR-012**: System MUST transfer host ownership to the longest-standing remaining member when the host leaves a waiting room, or close the room when no members remain.
- **FR-013**: System MUST allow only the host to start a room, and MUST require the minimum player count and readiness conditions before transitioning it out of the waiting state.
- **FR-014**: System MUST allow only the host to close a waiting room, invalidate its pending invitations, and prevent further joins.
- **FR-015**: System MUST return a clear, stable error for unauthenticated access, unauthorized room actions, full rooms, unavailable rooms, invalid settings, and conflicting membership changes.
- **FR-016**: System MUST preserve the final room configuration and roster once the room starts so a later gameplay feature can use them without ambiguity.
- **FR-017**: System MUST treat room membership, invitations, readiness, ownership, and lifecycle transitions as consistent state changes; a failed operation MUST NOT leave partial membership or invitation records.
- **FR-018**: System MUST NOT start, run, or resolve a poker hand as part of this feature; the room only prepares the participants and configuration for a later multiplayer gameplay feature.
- **FR-019**: System MUST NOT require real-time push communication in this feature; users can refresh room state, while a future multiplayer feature may add real-time synchronization without changing room rules.

### Key Entities *(include if feature involves data)*

- **PokerRoom**: A hosted poker-table lobby with a name, visibility, configuration, lifecycle state, host, capacity, and timestamps.
- **RoomMembership**: A user's membership in a room, including seat assignment, readiness, membership status, and join time.
- **RoomInvitation**: A host-issued invitation for an eligible user to join a private room, with pending, accepted, declined, expired, or invalidated state.
- **RoomConfiguration**: The immutable-on-start table settings, including seat limit, minimum players, starting stack, blind values, and visibility.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authenticated user can create a valid waiting room and see its roster and configuration in under 30 seconds without support or external documentation.
- **SC-002**: At least 95% of valid public-room join attempts succeed when capacity and membership rules permit, with no duplicate memberships or seat assignments.
- **SC-003**: 100% of unauthorized private-room reads, joins, invitations, starts, and closes are rejected without exposing private member or configuration data.
- **SC-004**: 100% of attempts to join full, started, or closed rooms leave the room roster and seat assignments unchanged.
- **SC-005**: A host can prepare a room with the required players ready and transition it to a fixed, non-joinable started state in no more than five user actions.
- **SC-006**: Users can always identify the room's host, lifecycle state, available seats, their own readiness, and the actions they are permitted to take from the room view.

## Assumptions

- Room membership is limited to one active room per user in this initial release to keep seat ownership unambiguous.
- Public rooms are discoverable only to authenticated users; private rooms are discoverable only to authorized members and invite recipients.
- Accepted friendship status from feature 002 is sufficient for host invitations; friend requests and friendship management remain outside this feature.
- A room starts only when its minimum player count is met and every current member is ready; the exact poker hand lifecycle is deferred to the multiplayer gameplay feature.
- Room and invitation records are retained long enough to support active-lobby behavior and operational cleanup; long-term hand history is outside this feature.
- Polling or explicit refresh is sufficient for lobby updates; real-time room synchronization and reconnect behavior belong to the future multiplayer feature.
- The host-transfer rule uses membership join time as the deterministic tie-breaker.
- The inferred feature scope is roadmap Etapa 7, “Rooms,” because feature 002 explicitly defers private-room invitations until the Rooms feature and feature 003 defers real-time multiplayer.