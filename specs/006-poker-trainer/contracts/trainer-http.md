# Poker Trainer HTTP Contract

All endpoints require the existing authenticated session. The server derives `userId` from the session and never accepts it from the client. Errors use the existing `{ "error": { "code": string, "message": string } }` envelope.

## Start or resume session

`POST /api/trainer/session/start`

Request:

```json
{ "format": "SIX_MAX_100BB_PREFLOP" }
```

The format may be omitted to use the first-release default. If an active session exists, the response returns that session and unchanged current scenario.

Response `200`:

```json
{
  "session": { "id": "uuid", "status": "ACTIVE", "format": "SIX_MAX_100BB_PREFLOP" },
  "scenario": {
    "id": "uuid", "sequence": 1, "tableSize": 6,
    "position": "BTN", "effectiveStackBB": 100,
    "holeCards": [{ "rank": "A", "suit": "s" }, { "rank": "K", "suit": "h" }],
    "blindContext": { "smallBlind": 1, "bigBlind": 2 },
    "priorActions": [],
    "legalActions": ["fold", "raise"],
    "strategyAvailable": true
  },
  "latestDecision": null
}
```

The response never includes the raw deck, future board, opponent hole cards, or internal engine snapshot.

## Get current session

`GET /api/trainer/session`

Response `200`: same envelope as start/resume. Returns the active scenario or the most recent completed result when no scenario is active. Returns `404 TRAINING_SESSION_NOT_FOUND` when the user has no session.

## Submit a decision

`POST /api/trainer/session/decisions`

Request:

```json
{
  "scenarioId": "uuid",
  "requestId": "client-retry-id",
  "action": { "type": "raise", "amountBB": 2.5 }
}
```

Response `201` for a new decision and `200` for an idempotent retry:

```json
{
  "decision": {
    "id": "uuid", "scenarioId": "uuid", "selectedAction": { "type": "raise", "amountBB": 2.5 },
    "evaluationStatus": "EVALUATED", "category": "PREFERRED",
    "recommendations": [{ "action": "raise", "frequency": 0.6 }],
    "explanation": { "factors": ["position", "effective stack", "prior action"] }
  }
}
```

For unsupported strategy data, `evaluationStatus` is `UNAVAILABLE`, `category` is null, and recommendations explicitly indicate unavailable data. Illegal actions return `409 ILLEGAL_ACTION` and do not create a decision. Wrong ownership returns `403 TRAINING_ACCESS_DENIED`; malformed input returns `400 VALIDATION_ERROR`.

## Continue to next scenario

`POST /api/trainer/session/next`

Request:

```json
{ "decisionId": "uuid", "requestId": "client-retry-id" }
```

Response `201`: the completed decision plus a fresh active scenario. The previous decision remains immutable and associated with the session.

## Progress

`GET /api/trainer/progress`

Response `200`:

```json
{
  "progress": {
    "completedDecisions": 12, "preferred": 6, "acceptableMixed": 3,
    "marginal": 1, "significantDeviation": 1, "unavailable": 1,
    "byAction": { "fold": 2, "call": 4, "raise": 6 }
  }
}
```

Counts are always filtered by the authenticated user. No-history response returns zero counts and an explicit empty state indicator.
