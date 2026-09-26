# API Contract: Local Games (Poker Engine)

Base path: `/api/local-games`. All endpoints require the feature 001 session cookie. Every response is redacted per the `asSeat` parameter (see data-model.md's Redaction rule) — no response ever includes another non-revealed seat's hole cards or the remaining deck.

**Error shape** (shared with features 001/002): `{ "error": { "code": "STRING_CODE", "message": "..." } }`

---

## POST /api/local-games

Start a new local hand (FR-001, FR-004, FR-012).

**Request**:

```json
{ "seatCount": 6, "startingStackBB": 100 }
```

`startingStackBB` is optional and defaults to 100 per the Constitution's initial configuration.

**Responses**:

| Status | Condition | Body |
|---|---|---|
| 201 | Hand created (dealer/blinds assigned, hole cards dealt, blinds posted) | `HandStateView` (see below), as seen by `asSeat=1` |
| 400 | `seatCount` outside 2-9, or invalid `startingStackBB` | `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }` |
| 409 | The caller already has an active (non-`complete`/`abandoned`) hand | `{ "error": { "code": "HAND_IN_PROGRESS", "message": "..." } }` |

---

## GET /api/local-games/current?asSeat={seatNumber}

Get the current hand's state, from the perspective of `asSeat` (FR-003, FR-017).

**Responses**:

| Status | Condition | Body |
|---|---|---|
| 200 | Hand exists | `HandStateView` |
| 400 | `asSeat` missing or not a valid seat number for this hand | `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }` |
| 404 | No active/recent hand for this user | `{ "error": { "code": "HAND_NOT_FOUND", "message": "..." } }` |

**`HandStateView` shape**:

```json
{
  "id": "uuid",
  "bettingRound": "flop",
  "communityCards": [{ "rank": "A", "suit": "s" }, ...],
  "pots": [{ "amount": 40, "eligibleSeats": [1,2,3], "winners": null }],
  "seatToAct": 2,
  "legalActions": {
    "seatNumber": 2,
    "actions": ["fold", "call", "raise"],
    "callAmount": 10,
    "minBetOrRaise": 20,
    "maxBetOrRaise": 480
  },
  "seats": [
    { "seatNumber": 1, "stack": 480, "holeCards": null, "folded": false, "isAllIn": false },
    { "seatNumber": 2, "stack": 490, "holeCards": [{ "rank": "K", "suit": "h" }, { "rank": "K", "suit": "d" }], "folded": false, "isAllIn": false }
  ],
  "result": null
}
```

`legalActions` is `null` once `bettingRound` is `showdown`/`complete`/`abandoned` (no seat is waiting to act). `result` is populated only once `bettingRound` is `complete` (FR-010, US3).

---

## POST /api/local-games/current/actions

Submit an action on behalf of the seat whose turn it currently is (FR-005, FR-006, FR-013).

**Request**:

```json
{ "seatNumber": 2, "type": "raise", "amount": 30 }
```

`amount` is omitted/ignored for `fold`/`check`/`all-in`.

**Responses**:

| Status | Condition | Body |
|---|---|---|
| 200 | Action applied; state advances (may auto-deal the next street or reach showdown) | `HandStateView`, as seen by the acting `seatNumber` |
| 400 | Illegal action (wrong turn, illegal check, below-minimum raise, amount exceeds stack, etc.) | `{ "error": { "code": "ILLEGAL_ACTION", "message": "..." } }` (message states the specific reason, e.g. minimum legal raise) |
| 404 | No active hand for this user | `{ "error": { "code": "HAND_NOT_FOUND", "message": "..." } }` |

---

## DELETE /api/local-games/current

Explicitly abandon the in-progress hand (FR-016), freeing the user to start a new one.

**Responses**:

| Status | Condition | Body |
|---|---|---|
| 204 | Hand abandoned (or there was none — idempotent) | *(empty)* |
