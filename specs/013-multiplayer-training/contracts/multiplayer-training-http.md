# Feature 013 HTTP Contract: Entrenamiento multijugador

All endpoints require an authenticated session. Room and table membership are resolved from the session identity; clients cannot select another user or seat.

## `POST /api/rooms/:roomId/training`

Creates the training overlay for the started room if it does not exist, or enrolls the authenticated room member in the existing overlay.

### Request

```json
{
  "mode": "CREATE_OR_JOIN"
}
```

The server ignores any client-supplied user, seat, table, strategy version, cards, board, stack, or evaluation fields.

### Success `200`

```json
{
  "training": {
    "id": "training-session-id",
    "tableId": "table-id",
    "status": "ACTIVE",
    "participant": {
      "userId": "current-user-id",
      "seatNumber": 3,
      "status": "ENROLLED"
    }
  },
  "table": {}
}
```

`table` is the same privacy-safe projection defined by Feature 005. The response never includes another participant's private feedback.

### Errors

- `400 VALIDATION_ERROR`: invalid mode or room id.
- `401 UNAUTHENTICATED`: no authenticated session.
- `403 ROOM_ACCESS_DENIED`: caller is not a member of the started room.
- `404 ROOM_NOT_FOUND`: room does not exist or is not available for training.
- `409 TRAINING_CLOSED`: the associated training session is terminal.
- `409 TABLE_CLOSED`: the table cannot accept a new training participant.

## `GET /api/rooms/:roomId/training`

Returns the caller's training enrollment, the authorized table projection, and the caller's own latest decisions.

### Success `200`

```json
{
  "training": {
    "id": "training-session-id",
    "tableId": "table-id",
    "status": "ACTIVE",
    "participant": {
      "userId": "current-user-id",
      "seatNumber": 3,
      "status": "ENROLLED"
    },
    "decisions": [
      {
        "id": "decision-id",
        "handId": "hand-id",
        "street": "FLOP",
        "selectedAction": { "type": "call", "amount": 20 },
        "evaluationStatus": "EVALUATED",
        "category": "ACCEPTABLE_MIXED",
        "equity": { "value": 0.42 },
        "strategy": { "version": "postflop-v2", "actions": [] },
        "explanation": { "factors": [], "assumptions": [], "limitations": [] }
      }
    ]
  },
  "table": {}
}
```

The `decisions` list is filtered by authenticated user and participant. It does not expose other players' decisions, contexts, recommendations, or evaluation snapshots.

### Errors

- `401 UNAUTHENTICATED`.
- `403 TRAINING_ACCESS_DENIED`: caller is not enrolled in the room's training session.
- `404 TRAINING_NOT_FOUND`.

## `GET /api/rooms/:roomId/training/decisions`

Returns the authenticated participant's paginated decisions. Query filters may include `handId`, `street`, and a bounded page size. The server applies the participant boundary before filtering.

### Success `200`

```json
{
  "items": [],
  "page": 1,
  "pageSize": 50,
  "total": 0
}
```

## `POST /api/rooms/:roomId/training/leave`

Stops capturing new training decisions for the authenticated participant while preserving the participant's normal table membership and previously stored feedback.

### Success `200`

```json
{
  "training": {
    "participantStatus": "LEFT"
  },
  "table": {}
}
```

The operation is idempotent. It does not fold the player or alter the poker hand.

## Existing table action contract extension

The canonical action remains `POST /api/rooms/:roomId/table/actions` and the `table:action` realtime event from Feature 005. No client flag is required to request evaluation. The server looks up whether the authenticated `TableParticipant` is enrolled in an active `MultiplayerTrainingSession`; if so, the accepted action also creates the private training decision atomically.

The action response continues to return the table projection. The caller receives private training feedback through the training response/event boundary, never through another participant's table projection.

## Error Codes

- `TRAINING_NOT_FOUND`
- `TRAINING_ACCESS_DENIED`
- `TRAINING_CLOSED`
- `TRAINING_PARTICIPANT_LEFT`
- `TRAINING_DECISION_NOT_FOUND`
- `TRAINING_FEEDBACK_UNAVAILABLE`
- `STALE_GAME_STATE`
- `DUPLICATE_ACTION`
- `ROOM_ACCESS_DENIED`

## Privacy Rules

- User and seat identity come from the authenticated session and persisted room membership.
- Request payloads cannot set cards, board, stacks, strategy version, equity, category, or evaluation snapshots.
- A table snapshot can show public game state and the viewer's own private cards, but never private training feedback.
- Training decision responses are always filtered to the current participant before serialization.
- Unavailable strategy/equity is represented as a limitation, not as a guessed recommendation.
