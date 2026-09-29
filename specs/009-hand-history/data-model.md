# Data Model: Historial general de manos

## HandHistory

Registro canónico de una mano que alcanzó un estado terminal.

| Field | Type | Rules |
|---|---|---|
| `id` | opaque identifier | Stable, unique, non-sequential externally; never guessable from list pagination. |
| `sourceType` | enum | `LOCAL_GAME`, `MULTIPLAYER`, or `TRAINER`; only enabled producers may publish. |
| `sourceId` | opaque identifier | Source identity used for idempotent publication; unique with `sourceType`. |
| `status` | enum | `COMPLETED`, `FOLDED`, `ALL_IN`, `ABANDONED`, or `ANONYMIZED`. |
| `format` | string/enum | Virtual poker format and configuration label. |
| `startedAt` | timestamp | Original start time. |
| `endedAt` | timestamp | Terminal time; must be equal to or later than `startedAt`. |
| `sequenceVersion` | integer | Schema/projection version used to interpret the snapshot. |
| `publicSnapshot` | structured JSON | Board, public stacks/pots, public result, authorized reveals, and summary metadata; excludes raw deck and unauthorized private cards. |
| `createdAt` | timestamp | Publication time. |
| `updatedAt` | timestamp | Last policy/anonymization update. |

### Integrity rules

- `sourceType + sourceId` is unique and publication is idempotent.
- `endedAt` is required for every record visible in history.
- Active sessions are never inserted as complete history records.
- A terminal record is append-only for poker facts; policy changes may update authorization or anonymization fields only.

## HandHistoryParticipant

Relationship between a history record and an account or an anonymized participant.

| Field | Type | Rules |
|---|---|---|
| `historyId` | identifier | References `HandHistory`. |
| `userId` | identifier nullable | Nullable after approved anonymization; never exposed as a foreign user's identity without authorization. |
| `seatNumber` | integer | Unique within a hand; preserves table position. |
| `displayNameSnapshot` | string nullable | Historical display value or anonymized label. |
| `role` | enum | `PLAYER`, `SPECTATOR` where the source supports it. |
| `visibility` | enum | `PARTICIPANT`, `AUTHORIZED_VIEWER`, or `ANONYMIZED`. |

### Integrity rules

- A participant may view only records whose authorization policy grants access.
- Removing a user's personal association must not silently remove other participants.
- Seat order is stable for the lifetime of the history record.

## HandAction

Immutable ordered action in the historical hand.

| Field | Type | Rules |
|---|---|---|
| `id` | opaque identifier | Stable within the history record. |
| `historyId` | identifier | References `HandHistory`. |
| `sequence` | integer | Starts at 1 and is unique per hand. |
| `street` | enum | `PREFLOP`, `FLOP`, `TURN`, `RIVER`, `SHOWDOWN`, or `TERMINAL`. |
| `seatNumber` | integer nullable | References the acting seat when applicable. |
| `actionType` | enum | Fold, check, call, bet, raise, all-in, blind, deal, showdown, or terminal event. |
| `amount` | number nullable | Non-negative virtual-chip amount when applicable. |
| `publicStateAfter` | structured JSON | Authorized public state after the action; no raw deck or unauthorized private state. |
| `occurredAt` | timestamp | Monotonic within the source sequence. |

### Integrity rules

- Sequence numbers are contiguous for a complete imported snapshot or explicitly identify unavailable legacy gaps.
- Actions cannot be changed after publication.
- Public state is projected again at read time for the requesting user.

## HistoryAccessPolicy

Rules for viewing and managing a history record.

| Field | Type | Rules |
|---|---|---|
| `historyId` | identifier | References `HandHistory`. |
| `userId` | identifier | Account receiving the policy. |
| `canList` | boolean | Allows inclusion in list results. |
| `canViewDetail` | boolean | Allows detail access. |
| `canRequestRemoval` | boolean | Allows privacy operation. |
| `redactionProfile` | enum | Determines which private cards, identities, and metadata may be shown. |
| `anonymizedAt` | timestamp nullable | Records when personal association was removed. |

## HandHistoryQuery

Non-persisted validated query object.

- `page`: positive integer, default 1.
- `pageSize`: bounded integer, default 25, maximum 100.
- `from` and `to`: optional inclusive date range; `from` cannot be after `to`.
- `format`: optional known format.
- `result`: optional terminal result/status filter.
- `participant`: optional authorized participant identifier or search token; must not expand visibility.
- `sort`: `endedAt` only in v1.
- `direction`: `asc` or `desc`, default `desc`.

## State transitions

```text
ACTIVE SOURCE
    |
    | terminal publication, exactly once
    v
HISTORICAL
    |
    | authorized privacy operation
    v
ANONYMIZED / RESTRICTED
```

A failed or unauthorized publication does not create a partial historical record. A repeated terminal publication returns the original record and does not append duplicate actions.
