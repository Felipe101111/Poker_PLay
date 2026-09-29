# Hand Replay HTTP Contract

Todas las operaciones requieren una sesión autenticada. El servidor autoriza el historial y devuelve únicamente la proyección permitida para el usuario solicitante. Los errores usan `{ "error": { "code", "message" } }`.

## Get replay document

`GET /api/hand-history/:historyId/replay`

La respuesta contiene todos los estados históricos que el usuario puede ver. La navegación posterior no necesita nuevas peticiones.

### Response `200`

```json
{
  "replay": {
    "historyId": "history-id",
    "sourceType": "MULTIPLAYER",
    "format": "SIX_MAX_100BB",
    "status": "COMPLETED",
    "sequenceVersion": 1,
    "initialState": {
      "board": [],
      "pot": 3,
      "participants": [{ "seatNumber": 1, "displayName": "Player", "isViewer": true }]
    },
    "events": [
      {
        "sequence": 1,
        "street": "PREFLOP",
        "seatNumber": 1,
        "actionType": "CALL",
        "amount": 2,
        "occurredAt": "2026-09-28T12:00:01.000Z",
        "stateAfter": { "board": [], "pot": 5 }
      },
      {
        "sequence": 2,
        "street": "FLOP",
        "seatNumber": 2,
        "actionType": "CHECK",
        "amount": null,
        "occurredAt": "2026-09-28T12:00:04.000Z",
        "stateAfter": { "board": ["Ah", "7d", "2c"], "pot": 5 }
      }
    ],
    "terminalState": { "board": ["Ah", "7d", "2c", "Ks", "9h"], "result": "WON" },
    "limitations": []
  }
}
```

### Response rules

- `events` are ordered ascending by `sequence` and preserve ties in `occurredAt`.
- `stateAfter` is omitted or null when the state is not available; the response includes a safe `limitation` instead of inventing a value.
- `initialState` and `terminalState` use the same privacy projection as each event.
- The response never includes the raw deck, unauthorized hole cards, internal engine bookkeeping, or hidden user identifiers.
- A document with no visible events returns `events: []` and a `NO_VISIBLE_EVENTS` limitation when the summary itself is authorized.

### Errors

- `401 UNAUTHENTICATED`: no valid authenticated session.
- `404 HAND_HISTORY_NOT_FOUND`: no authorized terminal record is visible for the requested identifier; must not disclose whether an unauthorized record exists.
- `409 HAND_HISTORY_NOT_TERMINAL`: the source cannot provide a terminal historical record.
- `409 HAND_HISTORY_REPLAY_UNAVAILABLE`: the record is published but cannot provide any valid replay projection.

## Client navigation contract

The browser maintains `position`, `isPlaying` and the selected playback speed locally.

- Initial `position` is `0`, representing `initialState`.
- `next` increments to the next visible event and clamps at the terminal position.
- `previous` decrements and clamps at `0`.
- Selecting an event sets `position` to that event's sequence/index.
- `pause` stops automatic advancement; `play` advances on the configured interval until the terminal position.
- Navigation never sends a mutation request and never changes the historical record.