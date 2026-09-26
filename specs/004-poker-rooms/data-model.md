# Feature 004 Data Model: Poker Rooms

## PokerRoom

Represents a hosted poker-table lobby before multiplayer gameplay begins.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary identifier. |
| `hostId` | UUID | References `User`; must identify the current member who owns host controls. |
| `name` | string | Trimmed, non-empty, 1-100 characters; control characters rejected. |
| `visibility` | enum | `PUBLIC` or `PRIVATE`. |
| `status` | enum | `WAITING`, `STARTED`, or `CLOSED`. |
| `seatLimit` | integer | 2-9. |
| `minPlayers` | integer | 2 through `seatLimit`. |
| `startingStackBB` | integer | Positive starting stack in big blinds. |
| `smallBlind` | integer | Positive chip amount. |
| `bigBlind` | integer | Positive amount greater than `smallBlind`. |
| `createdAt` | timestamp | Creation time. |
| `updatedAt` | timestamp | Last state/configuration update. |
| `startedAt` | timestamp nullable | Set once when the host starts the room. |
| `closedAt` | timestamp nullable | Set once when the room closes. |

Rules:

- Only `WAITING` rooms appear in public discovery.
- Configuration fields become immutable when status changes to `STARTED`.
- `STARTED` and `CLOSED` rooms reject joins and new invitations.
- A room with no remaining members closes when its last waiting member leaves.

## RoomMember

Represents one user's seat and lobby state in a room.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary identifier. |
| `roomId` | UUID | References `PokerRoom`; cascade cleanup when a room is deleted. |
| `userId` | UUID | References `User`; unique to enforce one active room membership per user. |
| `seatNumber` | integer | Unique within a room; assigned from 1 through `seatLimit`. |
| `ready` | boolean | Defaults false; mutable only while room is waiting and by the member themselves. |
| `joinedAt` | timestamp | Determines deterministic host-transfer order. |
| `lastSeenAt` | timestamp | Refreshed by authorized room reads and actions. |

Constraints:

- Unique `(roomId, userId)` prevents duplicate membership.
- Unique `(roomId, seatNumber)` prevents double-booking under concurrent joins.
- Unique `userId` enforces one active room membership across the platform.

## RoomInvitation

Represents a directed invitation to join a private room.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary identifier. |
| `roomId` | UUID | References `PokerRoom`; cascade cleanup when a room is deleted. |
| `fromUserId` | UUID | References the host/inviter. |
| `toUserId` | UUID | References the invited user. |
| `status` | enum | `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`, or `INVALIDATED`. |
| `createdAt` | timestamp | Invitation creation time. |
| `updatedAt` | timestamp | Last invitation transition. |

Constraints and transitions:

- Unique `(roomId, toUserId)` allows one current invitation record per recipient.
- Sender and recipient cannot be the same user.
- The recipient must be an accepted friend of the inviter.
- `PENDING -> ACCEPTED` occurs in the same transaction as membership creation.
- `PENDING -> DECLINED` is recipient-controlled.
- `PENDING -> EXPIRED` occurs after the configured invitation lifetime or room cleanup.
- `PENDING -> INVALIDATED` occurs when the room starts or closes.

## Relationships

```text
User 1 ---- * PokerRoom          (host)
User 1 ---- 1 RoomMember         (active membership limit)
PokerRoom 1 ---- * RoomMember    (seats)
PokerRoom 1 ---- * RoomInvitation
User 1 ---- * RoomInvitation      (sender)
User 1 ---- * RoomInvitation      (recipient)
```

## State Transitions

```text
WAITING --host starts with enough ready members--> STARTED
WAITING --host closes----------------------------> CLOSED
WAITING --last member leaves---------------------> CLOSED
WAITING --stale member cleanup-------------------> WAITING
STARTED -----------------------------------------> STARTED
CLOSED -------------------------------------------> CLOSED
```

Room cleanup must never alter a `STARTED` roster. A failed transition rolls back all membership, invitation, and host changes in the same operation.
