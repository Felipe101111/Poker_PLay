# Multiplayer Table HTTP Contract

The HTTP contract handles initial table access, full-state recovery, and explicit action submission. All endpoints require the existing authenticated session and are scoped to a started-room table.

## `GET /api/rooms/:roomId/table`

Returns the current table projection for the authenticated room member.

### Success `200`

```json
{
  "table": {
    "id": "table-id",
    "roomId": "room-id",
    "status": "ACTIVE",
    "handNumber": 4,
    "stateVersion": 18,
    "dealerSeat": 2,
    "currentHand": {
      "id": "hand-id",
      "status": "ACTIVE",
      "street": "FLOP",
      "board": ["..."],
      "pot": 120,
      "actingSeat": 3,
      "legalActions": ["fold", "call", "raise"],
      "privateCards": ["..."],
      "players": []
    }
  }
}
```

The `players` projection includes seat, display identity, stack, contribution, connection status, folded/all-in/eliminated state, and only authorized card visibility. The raw deck, another participant's unrevealed hole cards, and persistence-only fields are never returned.

### Errors

- `401 AUTHENTICATION_REQUIRED`: no authenticated session.
- `403 ROOM_ACCESS_DENIED`: authenticated user is not in the started room.
- `404 TABLE_NOT_FOUND`: the room has no available table.
- `409 TABLE_CLOSED`: the table is terminal and only completed results are available.

## `POST /api/rooms/:roomId/table/actions`

Submits an action for the authenticated member's own seat. The server resolves the seat from membership and ignores any client-supplied user identity.

### Request

```json
{
  "handId": "hand-id",
  "expectedVersion": 18,
  "requestId": "client-generated-id",
  "type": "raise",
  "amount": 40
}
```

`type` is one of `fold`, `check`, `call`, `bet`, `raise`, or `all-in`. `amount` is required only where the current Poker Engine action requires it.

### Success `200`

Returns the same authorized table projection as `GET`, with the newly committed `stateVersion`. The live event with the same state is emitted after the transaction commits.

### Errors

- `400 VALIDATION_ERROR`: malformed action shape or amount.
- `401 AUTHENTICATION_REQUIRED`: no authenticated session.
- `403 ROOM_ACCESS_DENIED`: actor is not a table participant.
- `404 HAND_NOT_FOUND`: hand does not belong to this table.
- `409 STALE_GAME_STATE`: `handId` or `expectedVersion` is no longer current.
- `409 NOT_YOUR_TURN`: another seat must act.
- `409 ILLEGAL_ACTION`: Poker Engine rejected the action.
- `409 DUPLICATE_ACTION`: request was already accepted; response includes the prior resulting state.
- `409 TABLE_CLOSED`: no further action is permitted.

## `POST /api/rooms/:roomId/table/reconnect`

Reauthorizes a returning member and returns a complete current projection. The operation is idempotent and never creates a second seat.

### Request

```json
{
  "lastSeenVersion": 16
}
```

### Success `200`

Returns the complete authorized table projection, including current presence, current hand/result, legal actions for the authenticated seat, and the newest `stateVersion`.

## Projection Rules

- The server is the source of truth for every field affecting play.
- Responses are calculated for the authenticated user, not from a requested `userId` or `seatNumber`.
- A completed showdown may reveal cards according to Poker Engine rules; otherwise other players' cards remain redacted.
- A missed live update is recovered by requesting the complete projection again.
