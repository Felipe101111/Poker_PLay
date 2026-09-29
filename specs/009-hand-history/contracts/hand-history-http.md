# Hand History HTTP Contract

All endpoints require an authenticated session. The server is authoritative for visibility, filtering, ordering, and privacy. Error responses use the repository's standard `{ "error": { "code", "message" } }` envelope.

## List history

`GET /api/hand-history`

### Query parameters

| Parameter | Type | Default | Rules |
|---|---|---:|---|
| `page` | integer | `1` | Positive integer. |
| `pageSize` | integer | `25` | Integer from 1 through 100. |
| `from` | ISO date | none | Inclusive start date. |
| `to` | ISO date | none | Inclusive end date; cannot precede `from`. |
| `format` | known string | none | Server-supported virtual format. |
| `result` | known string | none | Terminal status/result filter. |
| `participant` | string | none | Only matches authorized participant data. |
| `sort` | `endedAt` | `endedAt` | No arbitrary field names in v1. |
| `direction` | `asc` or `desc` | `desc` | Stable secondary order by history ID. |

### Response `200`

```json
{
  "items": [
    {
      "id": "history-id",
      "sourceType": "MULTIPLAYER",
      "format": "SIX_MAX_100BB",
      "status": "COMPLETED",
      "startedAt": "2026-09-28T12:00:00.000Z",
      "endedAt": "2026-09-28T12:04:12.000Z",
      "summary": {
        "board": ["Ah", "7d", "2c", "Ks", "9h"],
        "pot": 120,
        "result": "WON",
        "participantCount": 3
      }
    }
  ],
  "page": 1,
  "pageSize": 25,
  "total": 1,
  "hasNextPage": false
}
```

The list never includes raw deck, opponent hole cards, internal engine snapshots, or a record the caller is not authorized to list.

## Get detail

`GET /api/hand-history/:historyId`

### Response `200`

```json
{
  "hand": {
    "id": "history-id",
    "sourceType": "MULTIPLAYER",
    "format": "SIX_MAX_100BB",
    "status": "COMPLETED",
    "startedAt": "2026-09-28T12:00:00.000Z",
    "endedAt": "2026-09-28T12:04:12.000Z",
    "board": ["Ah", "7d", "2c", "Ks", "9h"],
    "participants": [
      { "seatNumber": 1, "displayName": "Player", "isViewer": true },
      { "seatNumber": 2, "displayName": "Opponent", "isViewer": false }
    ],
    "actions": [
      { "sequence": 1, "street": "PREFLOP", "seatNumber": 1, "type": "call", "amount": 2 },
      { "sequence": 2, "street": "FLOP", "seatNumber": 2, "type": "check", "amount": null }
    ],
    "pots": [{ "amount": 120, "winners": [1] }],
    "revealedCards": [],
    "limitations": []
  }
}
```

Unrevealed private cards are omitted, not represented by client-controlled placeholders. A legacy field that cannot be reconstructed is omitted and listed in `limitations`.

### Errors

- `401 UNAUTHENTICATED`: no valid authenticated session.
- `404 HAND_HISTORY_NOT_FOUND`: no authorized record is visible for the requested identifier. This response must not reveal whether an unauthorized record exists.
- `409 HAND_HISTORY_NOT_TERMINAL`: source record cannot be published because the hand is still active.

## Request privacy operation

`DELETE /api/hand-history/:historyId`

The operation applies only to the authenticated user's association. It is idempotent.

### Response `200`

```json
{
  "result": {
    "historyId": "history-id",
    "status": "ANONYMIZED",
    "visibleInMyHistory": false
  }
}
```

The response reports the policy outcome without exposing other participants' private data.

### Errors

- `401 UNAUTHENTICATED`: no valid session.
- `404 HAND_HISTORY_NOT_FOUND`: no eligible authorized record.
- `409 HAND_HISTORY_RETENTION_REQUIRED`: complete deletion is not permitted because shared integrity or retention rules apply; the server must apply the documented anonymization alternative where possible.

## Internal publication boundary

Producers publish a terminal snapshot through an authenticated server-side application boundary, not through a public client endpoint. Publication requires `sourceType`, `sourceId`, terminal status, timestamps, authorized participant mapping, public snapshot, and ordered actions. Repeating the same `(sourceType, sourceId)` returns the existing history record without duplication.
