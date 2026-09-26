# Multiplayer Table Real-Time Contract

The live table connection uses the authenticated session and subscribes only to one authorized started-room table at a time. Event payloads use the same per-user table projection rules as the HTTP contract.

## Client to Server Events

### `table:join`

```json
{ "roomId": "room-id", "lastSeenVersion": 16 }
```

The server verifies session identity and started-room membership, then emits `table:snapshot` with the newest authorized state. Joining is idempotent.

### `table:leave`

```json
{ "roomId": "room-id" }
```

Leaves the live connection subscription. It does not remove the room member or abandon the player's seat by itself.

### `table:heartbeat`

```json
{ "roomId": "room-id" }
```

Updates server-side presence for the authenticated participant. Client timestamps are ignored.

### `table:action`

```json
{
  "roomId": "room-id",
  "handId": "hand-id",
  "expectedVersion": 18,
  "requestId": "client-generated-id",
  "type": "call",
  "amount": 20
}
```

The server validates the action exactly as the HTTP action contract does. The event is not authoritative merely because it arrived over an authenticated connection.

## Server to Client Events

### `table:snapshot`

```json
{
  "roomId": "room-id",
  "stateVersion": 19,
  "table": {}
}
```

Contains the complete authorized table projection. Clients replace older local state and ignore snapshots with a lower `stateVersion`.

### `table:state-changed`

```json
{
  "roomId": "room-id",
  "stateVersion": 19,
  "cause": "ACTION_ACCEPTED",
  "table": {}
}
```

Broadcast after an authoritative transaction commits. Causes include `HAND_STARTED`, `ACTION_ACCEPTED`, `STREET_ADVANCED`, `HAND_COMPLETED`, `PLAYER_ELIMINATED`, `PLAYER_AUTO_FOLDED`, and `TABLE_CLOSED`.

### `table:presence-changed`

```json
{
  "roomId": "room-id",
  "stateVersion": 19,
  "userId": "redacted-or-authorized-id",
  "seatNumber": 3,
  "status": "DISCONNECTED"
}
```

Exposes only the presence information authorized table members need. A disconnect starts the server-owned grace period; reconnect changes the status back to `ONLINE`.

### `table:error`

```json
{
  "code": "STALE_GAME_STATE",
  "message": "The table has advanced. Refresh the current table state.",
  "stateVersion": 19
}
```

Uses the same stable error codes as the HTTP contract. Errors do not mutate client state; the client requests or accepts the newest snapshot.

## Delivery and Ordering Rules

- Every accepted action produces at most one authoritative state transition and one committed state version.
- Broadcasts happen after persistence commits; missed broadcasts are recoverable through `table:join`, reconnect, or the HTTP snapshot endpoint.
- Clients must discard older versions and never merge private-card fields from another user's projection.
- A connection may not subscribe to a table after authorization fails, and all action events are checked against the authenticated session identity.
