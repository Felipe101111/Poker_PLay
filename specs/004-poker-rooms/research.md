# Feature 004 Research: Poker Rooms

## Decision: Persist rooms, memberships, and invitations in PostgreSQL

**Rationale**: Rooms are shared by authenticated users, must survive page refreshes, and require consistent concurrent membership changes. The existing project already uses Prisma and PostgreSQL for users and friendships, so room state belongs in the same persistence boundary rather than in process memory.

**Alternatives considered**:

- In-memory room state: rejected because it cannot safely coordinate multiple backend requests or survive a restart.
- Persisting only a room snapshot: rejected because membership, invitations, and uniqueness rules need independently queryable records.

## Decision: Use explicit room lifecycle states

The lifecycle is `WAITING -> STARTED` or `WAITING -> CLOSED`. `STARTED` means the lobby is locked and its roster/configuration is fixed for the future multiplayer feature; it does not deal cards or run a hand. `CLOSED` is terminal and rejects all joins and invitations.

**Rationale**: Explicit states make joinability, host controls, and authorization decisions testable without coupling room management to the Poker Engine.

**Alternatives considered**:

- Boolean `isOpen`: rejected because it cannot distinguish a started room from a deliberately closed room.
- Starting a hand immediately: rejected by FR-018 and the feature boundary between rooms and multiplayer gameplay.

## Decision: Enforce membership and seat uniqueness in the database

`RoomMember` has unique `(roomId, userId)` and `(roomId, seatNumber)` constraints. The service selects the lowest available seat inside a transaction and translates unique-constraint conflicts into stable room errors. A user has at most one active membership because the membership row is unique by `userId`; leaving a waiting room deletes that membership, while started-room membership remains fixed.

**Rationale**: Application-only checks are vulnerable to two users claiming the final seat concurrently. Database uniqueness is the final authority and aligns with the existing friends race-handling pattern.

**Alternatives considered**:

- A separate seat table: rejected as unnecessary for 2-9 fixed seats.
- Application-only locking: rejected because it would not protect against concurrent requests across backend instances.

## Decision: Keep one current invitation per room and recipient

`RoomInvitation` is directed from host to recipient and has `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`, and `INVALIDATED` states. A unique `(roomId, toUserId)` constraint prevents duplicate invitation rows. Accepting an invitation atomically creates membership and marks the invitation accepted; closing or starting a room invalidates pending invitations.

**Rationale**: The room does not need an invitation history system yet, but explicit terminal states make responses and cleanup deterministic. Accepted-friend validation reuses feature 002's friendship state.

**Alternatives considered**:

- Reusing friend-request rows: rejected because room invitations have different ownership, lifecycle, and authorization semantics.
- Deleting every invitation after use: rejected because terminal state is useful for idempotency and conflict diagnostics.

## Decision: Use a 15-minute inactivity timeout for waiting-room presence

Room reads and membership-changing requests refresh a member's `lastSeenAt`. A member whose session is no longer active and whose `lastSeenAt` is older than 15 minutes is marked unavailable and their waiting-room seat is released. A started room never changes its fixed roster through this cleanup path.

**Rationale**: This is the recommended compromise for the unanswered clarification: brief disconnects do not immediately remove a player, while abandoned sessions cannot block a room indefinitely. The timeout is a documented product constant and can become configurable later.

**Alternatives considered**:

- Immediate release: rejected because normal short-lived browser or network interruptions would unexpectedly remove players.
- No automatic release: rejected because stale members could permanently consume the limited room capacity.

## Decision: Use REST refreshes, not real-time push, for this feature

Room list, detail, roster, invitation, readiness, and lifecycle operations are request/response endpoints. The future multiplayer feature may add WebSocket synchronization around these persisted states.

**Rationale**: FR-019 explicitly defers real-time communication, and polling/refresh is sufficient for a waiting lobby while keeping the room module transport-independent at the domain boundary.

## Decision: Preserve existing project validation and testing conventions

Routes use `requireAuth`, Zod schemas, centralized `ApiError` responses, Prisma transactions, and service-layer authorization. Contract tests use Supertest agents and database reset helpers; integration tests cover race conditions and persistence invariants.

**Rationale**: Reusing the existing conventions reduces security drift and keeps feature 004 consistent with features 001-003.
