# Phase 1 Data Model: Friends System

## Entity: FriendRequest

Represents the single live connection state (if any) between two existing `User` records (feature 001). At most one row exists per unordered pair of users at any time.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID (PK) | Generated server-side at creation; immutable. |
| `senderId` | UUID (FK → User.id) | The user who initiated the currently-live request. For an `ACCEPTED` row, this is whoever sent the request that was ultimately accepted (kept for reference only — both members have equal standing as friends once accepted). |
| `receiverId` | UUID (FK → User.id) | The other user. Must differ from `senderId` (FR-004 — no self-requests). |
| `userLowId` | UUID (FK → User.id) | `senderId`/`receiverId` sorted so this is always the lexicographically smaller of the two IDs. Not exposed via the API — internal normalization field only. |
| `userHighId` | UUID (FK → User.id) | The lexicographically larger of the two IDs. |
| `status` | enum: `PENDING` \| `ACCEPTED` | No `REJECTED`/`CANCELLED`/`REMOVED` values — those outcomes delete the row instead (see Lifecycle). |
| `createdAt` | timestamp | Set once when the row is first created. |
| `updatedAt` | timestamp | Updated when `PENDING` transitions to `ACCEPTED`. |

**Validation rules**:
- `senderId !== receiverId` (FR-004).
- Unique constraint on (`userLowId`, `userHighId`) — guarantees at most one row per pair regardless of direction (FR-005, FR-006).
- Creating a new request when a row already exists for the pair is only valid in one case: the existing row is `PENDING` **and** was sent in the opposite direction (i.e., the new "sender" is the existing row's `receiverId`) — this is treated as an acceptance (FR-006), not a new row.
- Any other attempt to create a request for a pair that already has a row (same-direction `PENDING`, or any `ACCEPTED`) is rejected as a conflict (FR-005).

**Lifecycle**:

```text
(no row for this pair)
   --(A sends request to B)--> PENDING (senderId=A, receiverId=B)

PENDING (senderId=A, receiverId=B)
   --(B accepts)--> ACCEPTED                                  [FR-008]
   --(B rejects)--> row deleted, no friendship created         [FR-008, FR-009]
   --(A cancels)--> row deleted                                [FR-010]
   --(B sends a request back to A, i.e. the reverse direction)--> ACCEPTED
                                                                 [FR-006, treated as acceptance]

ACCEPTED
   --(either member removes the friendship)--> row deleted     [FR-011]
```

- After a row is deleted (rejected/cancelled/removed), a brand-new request between the same two users creates a brand-new row with a new `id` and `createdAt` (FR-009) — the unique pair constraint no longer blocks it, since the old row no longer exists.

**Relationships**: `senderId`, `receiverId`, `userLowId`, `userHighId` all reference `User.id` (feature 001). A user's **friends list** (US3) is derived, not stored separately: all `ACCEPTED` rows where the user is either `userLowId` or `userHighId`, returning the *other* user in each row.

## Derived concept: Online status (not a stored field)

- Not part of `FriendRequest` or `User` — computed on read by calling `isUserOnline(userId)` (exported from the `auth` module), which checks whether `connect-pg-simple`'s `session` table has at least one non-expired row whose stored session data references that `userId` (FR-013).
