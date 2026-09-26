# Feature 005 Data Model

## MultiplayerTable

Represents the live gameplay boundary created from one started `PokerRoom`.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary identity. |
| `roomId` | UUID | Required; unique one-to-one relationship with a started `PokerRoom`. |
| `status` | `ACTIVE` or `CLOSED` | `ACTIVE` while hands may be played; terminal `CLOSED` when fewer than two eligible players remain or the table is explicitly ended by an allowed lifecycle action. |
| `handNumber` | integer | Monotonically increasing table hand number. |
| `currentHandId` | UUID nullable | Points to the one active hand, if any. |
| `dealerSeat` | integer | Current dealer position from the fixed room roster. |
| `stateVersion` | integer | Monotonically increasing version for stale-client detection and ordered broadcasts. |
| `createdAt` | timestamp | Creation time. |
| `updatedAt` | timestamp | Last authoritative state change. |
| `closedAt` | timestamp nullable | Set once the table becomes terminal. |

**Constraints**:

- A table can be created only for a `STARTED` room.
- `roomId` is unique; starting or reconnecting cannot create a second table for the same room.
- Only one hand may be active for a table at a time.
- Public table views never expose raw persisted snapshots or hidden cards belonging to another participant.

## TableParticipant

Represents one started-room member's fixed seat and gameplay balance.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary identity. |
| `tableId` | UUID | Required relationship to `MultiplayerTable`. |
| `userId` | UUID | Required relationship to `User`. |
| `roomMemberId` | UUID | Required relationship to the fixed `RoomMember` seat. |
| `seatNumber` | integer | Copied from the started roster; unique within a table. |
| `stack` | integer | Non-negative virtual-chip balance, updated only by authoritative hand completion/state transitions. |
| `eligibleForNextHand` | boolean | False when the participant reaches zero chips; false permanently for this table once eliminated. |
| `connectionStatus` | `ONLINE`, `DISCONNECTED`, or `ELIMINATED` | Presence projection for authorized table members. |
| `lastSeenAt` | timestamp | Last server-observed connection or heartbeat. |
| `disconnectedAt` | timestamp nullable | Start of the current disconnect grace period. |
| `eliminatedAt` | timestamp nullable | Set when the participant reaches zero chips after hand completion. |

**Constraints**:

- Unique `(tableId, userId)`, `(tableId, roomMemberId)`, and `(tableId, seatNumber)` prevent duplicate identity or seat allocation.
- `userId`, seat, and stack are always derived from server-side records, never trusted from an action payload.
- An eliminated participant remains visible in completed results but cannot act or enter later hands.

## MultiplayerHand

Represents one authoritative hand and its lifecycle.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary identity. |
| `tableId` | UUID | Required relationship to `MultiplayerTable`. |
| `handNumber` | integer | Unique within the table. |
| `status` | `ACTIVE`, `COMPLETED`, or `ABANDONED` | Active hand accepts actions; terminal states reject them. |
| `stateSnapshot` | JSON | Serialized Poker Engine state, including private cards and deck state; never returned without per-user projection. |
| `stateVersion` | integer | Starts at 1 and increments for every accepted transition. |
| `actingSeat` | integer nullable | Current seat required to act, if any. |
| `startedAt` | timestamp | Hand start time. |
| `completedAt` | timestamp nullable | Terminal transition time. |
| `resultSnapshot` | JSON nullable | Publicly releasable final result after showdown or fold award. |

**Constraints**:

- Unique `(tableId, handNumber)` and at most one active hand per table.
- All rules transitions are performed by the existing Poker Engine; the persistence layer stores the resulting state and does not calculate poker outcomes.
- `stateSnapshot` is encrypted or access-controlled at the persistence boundary as appropriate; response projection is mandatory even for authorized table members.

## TableAction

Append-only record of an action request and its authoritative outcome.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary identity. |
| `handId` | UUID | Required relationship to `MultiplayerHand`. |
| `requestId` | UUID/string | Client-generated idempotency key, unique within a hand and participant. |
| `sequence` | integer | Strictly increasing accepted-action sequence within the hand. |
| `userId` | UUID | Authenticated actor; must match the acting seat. |
| `seatNumber` | integer | Server-resolved acting seat. |
| `actionType` | enum | Fold, check, call, bet, raise, or all-in. |
| `amount` | integer nullable | Validated amount when required by the action. |
| `accepted` | boolean | Accepted actions are appended to the authoritative sequence; rejected requests may be recorded for diagnostics without changing game state. |
| `rejectionCode` | string nullable | Stable error code for a rejected request. |
| `resultingVersion` | integer nullable | New hand version for an accepted transition. |
| `createdAt` | timestamp | Server time for ordering and audit. |

**Constraints**:

- Unique `(handId, userId, requestId)` makes client retries idempotent.
- Accepted actions are written in the same transaction as the next hand snapshot and participant balance updates.
- Rejected actions never alter the hand snapshot, stacks, board, pots, or turn.

## PrivateCardView

A response projection, not an independent source of truth. It contains a participant's own hole cards for that authenticated user and face-down placeholders for other active players until legitimate showdown.

## HandResult

The public terminal projection of a `MultiplayerHand`, including board, legitimately revealed cards, evaluated hands, main/side-pot awards, updated stacks, eliminated participants, and the next table status. It is immutable after completion.

## Presence and State Transitions

```text
MultiplayerTable: ACTIVE -> CLOSED
MultiplayerHand: ACTIVE -> COMPLETED
MultiplayerHand: ACTIVE -> ABANDONED only for an explicitly allowed terminal failure
TableParticipant: ONLINE <-> DISCONNECTED
TableParticipant: ONLINE or DISCONNECTED -> ELIMINATED after a completed hand reduces stack to zero
```

- A disconnect starts a server-owned 60-second grace period and changes presence to `DISCONNECTED`.
- Reconnection within the grace period restores `ONLINE` and returns the latest authorized snapshot.
- If the disconnected participant is acting when the grace period expires, the server submits one automatic fold through the Poker Engine.
- After hand completion, zero-stack participants become `ELIMINATED`; if fewer than two eligible participants remain, the table becomes `CLOSED`.
- If at least two eligible participants remain, the table creates the next hand atomically, rotates the dealer among eligible seats, and increments the table version.
