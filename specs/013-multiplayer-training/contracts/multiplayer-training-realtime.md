# Feature 013 Realtime Contract: Entrenamiento multijugador

The existing authenticated table socket remains the transport for shared game state. Training feedback is emitted only to the participant who owns the decision.

## Client to Server Events

### `training:join`

```json
{ "roomId": "room-id" }
```

Enrolls the authenticated table member and acknowledges with the same result as `POST /api/rooms/:roomId/training`. Joining is idempotent.

### `training:leave`

```json
{ "roomId": "room-id" }
```

Stops new decision capture for the authenticated participant without leaving the poker table. Repeating the event is safe.

### `table:action`

Uses the existing Feature 005 payload:

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

The server validates the action through the existing table contract, then captures training feedback only when the authenticated participant is enrolled.

## Server to Client Events

### `training:joined`

```json
{
  "roomId": "room-id",
  "trainingSessionId": "training-session-id",
  "participantStatus": "ENROLLED"
}
```

Sent only to the joining participant.

### `training:decision-evaluated`

```json
{
  "roomId": "room-id",
  "trainingSessionId": "training-session-id",
  "decision": {
    "id": "decision-id",
    "handId": "hand-id",
    "street": "TURN",
    "selectedAction": { "type": "raise", "amount": 60 },
    "evaluationStatus": "UNAVAILABLE",
    "category": null,
    "equity": null,
    "strategy": null,
    "explanation": {
      "factors": [],
      "assumptions": [],
      "limitations": ["No compatible published strategy"]
    }
  }
}
```

The event is emitted only to the socket authenticated as the acting participant. It never broadcasts the decision or feedback to the table room.

### `training:completed`

```json
{
  "roomId": "room-id",
  "trainingSessionId": "training-session-id",
  "status": "COMPLETED",
  "historyId": "history-id"
}
```

Emitted privately to enrolled participants after terminal history publication succeeds or is confirmed idempotently. The `historyId` is subject to the existing history access policy.

### `training:error`

```json
{
  "code": "TRAINING_FEEDBACK_UNAVAILABLE",
  "message": "Feedback is not available for this context"
}
```

Errors do not mutate the local table state. The client can recover the table with the existing snapshot/reconnect flow and recover feedback with the HTTP training endpoint.

## Delivery and Ordering Rules

- Table state events continue to be broadcast after the authoritative transaction commits.
- Training feedback events are emitted after the decision and evaluation snapshot commit.
- A feedback event with a duplicate decision id is ignored by the client.
- Table state versions and training decision identities are independent; clients must not use a feedback event to advance table state.
- Reconnection first restores the authorized table snapshot, then fetches the caller's training decisions to fill missed private events.
- Socket authorization and participant filtering are re-applied for every event; room subscription alone never grants access to training feedback.
