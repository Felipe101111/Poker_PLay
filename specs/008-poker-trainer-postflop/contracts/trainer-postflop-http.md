# Trainer Postflop HTTP Contract

All endpoints require the existing authenticated session. The server is authoritative for all fields derived from the hand engine and strategy/equity engines.

## Start or resume postflop session

`POST /api/trainer/postflop/session/start`

Request:

```json
{}
```

Response `200`:

```json
{
  "session": { "id": "uuid", "status": "ACTIVE", "format": "SIX_MAX_100BB_POSTFLOP" },
  "scenario": {
    "id": "uuid",
    "sequence": 1,
    "street": "flop",
    "board": [{ "rank": "A", "suit": "s" }],
    "holeCards": [{ "rank": "K", "suit": "h" }, { "rank": "Q", "suit": "h" }],
    "position": "BTN",
    "potBB": 6,
    "effectiveStackBB": 98,
    "priorActions": [],
    "legalActions": { "actions": ["check", "bet"], "callAmountBB": 0, "minBetOrRaiseBB": 1, "maxBetOrRaiseBB": 98 },
    "strategyAvailable": true,
    "strategyVersion": "postflop-v1"
  },
  "latestDecision": null
}
```

The response MUST omit the raw deck, opponent hole cards, future board cards, internal engine bookkeeping, and client-provided strategy data.

## Submit a street decision

`POST /api/trainer/postflop/session/decisions`

Request:

```json
{
  "scenarioId": "uuid",
  "requestId": "uuid",
  "action": { "type": "bet", "amountBB": 3 }
}
```

Response `201` for a new decision or `200` for an idempotent retry:

```json
{
  "decision": {
    "id": "uuid",
    "scenarioId": "uuid",
    "street": "flop",
    "selectedAction": { "type": "bet", "amountBB": 3 },
    "evaluationStatus": "EVALUATED",
    "category": "ACCEPTABLE_MIXED",
    "recommendations": [{ "action": { "type": "bet", "amountBB": 3 }, "frequency": 0.6 }],
    "explanation": {
      "factors": ["Board texture", "Position", "Prior action"],
      "assumptions": ["Effective stack: 100 BB"],
      "limitations": []
    },
    "equity": {
      "method": "EXACT",
      "precision": 0.000001,
      "participants": [],
      "tieProbability": 0,
      "runoutsEvaluated": 1081,
      "blockedComboCount": 4,
      "remainingWeight": {},
      "inputFingerprint": "sha256:..."
    }
  },
  "duplicate": false
}
```

Errors include `400` for malformed input, `403` for a foreign scenario, `409` for illegal/stale actions, and `404` for a missing session or scenario. Error responses never reveal hidden cards or strategy rows belonging to another user.

## Continue to the next street

`POST /api/trainer/postflop/session/next`

Request:

```json
{ "decisionId": "uuid", "requestId": "uuid" }
```

Response `201` returns the completed decision and the next authorized scenario. The server returns a terminal result instead of a next scenario when the engine ends the hand. The request is rejected when the current scenario has no persisted decision.

## Resume

`GET /api/trainer/postflop/session`

Returns the active scenario and the latest decision sequence for the authenticated user. It never returns another user's session, raw deck, future board, or unrevealed opponent cards.
