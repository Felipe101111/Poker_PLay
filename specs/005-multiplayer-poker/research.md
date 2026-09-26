# Feature 005 Research

## Decision: Use Socket.IO for live table updates

**Rationale**: The existing backend is an Express session-based web service with no real-time transport. Socket.IO integrates with the existing HTTP server, supports authenticated connection middleware, room-scoped broadcasts, heartbeat/disconnect events, and client reconnection. It provides the live update behavior required by FR-008, FR-009, FR-012, and the constitution's multiplayer principles without requiring custom upgrade and reconnect handling.

**Alternatives considered**:

- Raw WebSocket: lower-level and viable, but would require implementing connection authentication, room membership, heartbeats, reconnection state delivery, and broadcast error handling directly.
- Server-sent events plus HTTP actions: simpler one-way delivery, but does not provide a natural bidirectional table session and adds separate polling/action coordination for presence and reconnect.
- HTTP polling only: compatible with the current API but does not satisfy the intended live-table experience or the one-second propagation target reliably.

## Decision: Keep PostgreSQL as the authoritative source for active multiplayer state

**Rationale**: The existing local game store is process-local and cannot safely support reconnect recovery, server restarts, or more than one backend process. Persisting the table roster, hand snapshot, action sequence, and participant stacks makes the state recoverable and lets database constraints protect uniqueness and authorization. The pure Poker Engine remains responsible for rules; persistence stores and restores its state rather than reimplementing rules.

**Alternatives considered**:

- In-memory state only: rejected because it loses active hands on restart and cannot coordinate multiple processes.
- Event log only: useful for history, but unnecessarily complex for the initial feature; a current snapshot plus append-only accepted actions gives recovery and auditability now.
- External cache as the source of truth: rejected because it adds an unavailable dependency and weakens the existing PostgreSQL consistency boundary.

## Decision: Serialize actions with a database transaction and version check

**Rationale**: Every action must read the current hand, validate it through the Poker Engine, persist the next snapshot, append the accepted action, and update participant stacks atomically. A row lock on the table/current-hand record plus a monotonically increasing state version ensures concurrent requests for one turn cannot both succeed. A request carrying an older hand/version receives a stable conflict response. Broadcasts occur only after commit.

**Alternatives considered**:

- Application-local mutex: fails across multiple backend processes and does not survive process boundaries.
- Blind last-write-wins updates: can duplicate actions, cards, or pot awards.
- Advisory locks without version checks: serializes writes, but explicit versions still provide useful stale-client detection and reconnect convergence.

## Decision: Use the existing session identity for real-time authorization

**Rationale**: Feature 001 already authenticates users with a server-side session cookie. The real-time connection must validate that session during the handshake and attach the authenticated user identity to the connection. Every table subscription and action is authorized against the persisted started-room roster; client-supplied user IDs are ignored.

**Alternatives considered**:

- A second token system: adds credential lifecycle and revocation complexity without a product requirement.
- Trusting a user ID sent in the connection payload: violates the constitution's client-trust and private-information rules.

## Decision: Reconnect by returning a complete authorized snapshot

**Rationale**: A reconnecting client must converge even if it missed several broadcasts. The server returns the newest table state projected for that user, including a state version, current hand, legal actions, presence, and completed result when relevant. Clients discard older versions. The same user remains bound to one persisted seat per started room.

**Alternatives considered**:

- Replay only missed events: requires durable client cursors and more complex event retention; not necessary for the initial one-table scope.
- Recreate the player seat on every connection: risks duplicate seats and violates FR-009.

## Decision: Track disconnect grace server-side

**Rationale**: The server records last-seen and disconnected timestamps and owns the 60-second timer. A periodic reaper or equivalent server-managed scheduler folds an acting player exactly once after the grace period, persists the result transactionally, and broadcasts the new state. Client clocks are never trusted.

**Alternatives considered**:

- Client-side timeout: a malicious or closed client could avoid the rule.
- A timer per socket only: timers disappear on process restart and do not cover multi-instance coordination.

## Decision: Keep the first release to one table per started room and one active hand

**Rationale**: This matches the specification's assumptions, preserves the room module as the membership boundary, and limits state coordination while still delivering the complete multiplayer gameplay loop. The model leaves room for later hand history, tournaments, and multi-table features without mixing them into this change.

**Alternatives considered**:

- General tournament/table orchestration now: explicitly out of scope and would violate the project's incremental-development and no-premature-overengineering principles.
