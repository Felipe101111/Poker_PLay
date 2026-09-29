# Hand Analytics HTTP Contract

## GET `/api/hand-history/analytics`

Returns personal, privacy-safe analytics over terminal hand histories visible to the authenticated user.

### Authentication

Requires the existing authenticated session. Requests without a session receive the standard `401 UNAUTHENTICATED` envelope.

### Query parameters

| Parameter | Type | Required | Rules |
|---|---|---:|---|
| `from` | ISO-8601 datetime | No | Inclusive `endedAt` lower bound |
| `to` | ISO-8601 datetime | No | Inclusive `endedAt` upper bound; must be >= `from` |
| `format` | string | No | Exact hand format filter |
| `relatedLimit` | integer | No | 1-50; default 20 |

Invalid dates, reversed ranges, unsupported limits, or malformed values return the standard `400 VALIDATION_ERROR` envelope.

### Success response `200`

```json
{
  "analytics": {
    "filters": {
      "from": "2026-01-01T00:00:00.000Z",
      "to": "2026-09-28T23:59:59.999Z",
      "format": "SIX_MAX_100BB",
      "eligibleHands": 42
    },
    "summary": {
      "handsPlayed": 42,
      "netResult": 184,
      "evResult": 161.5,
      "winRate": { "value": 0.5714, "numerator": 24, "denominator": 42, "sampleThreshold": 30, "isSufficient": true },
      "roi": { "value": null, "numerator": 0, "denominator": 0, "sampleThreshold": 30, "isSufficient": false },
      "netResultAvailable": true,
      "evAvailable": true
    },
    "trend": [
      { "periodStart": "2026-09-01T00:00:00.000Z", "periodEnd": "2026-09-01T23:59:59.999Z", "hands": 12, "netResult": 80, "evResult": 71 }
    ],
    "overall": {
      "scope": "ALL",
      "vpip": { "value": 0.32, "numerator": 13, "denominator": 40, "sampleThreshold": 30, "isSufficient": true },
      "pfr": { "value": 0.2, "numerator": 8, "denominator": 40, "sampleThreshold": 30, "isSufficient": true },
      "threeBet": { "value": null, "numerator": 0, "denominator": 0, "sampleThreshold": 30, "isSufficient": false },
      "winRate": { "value": 0.5714, "numerator": 24, "denominator": 42, "sampleThreshold": 30, "isSufficient": true }
    },
    "byPosition": [],
    "byStreet": [],
    "relatedHands": [
      { "historyId": "history-id", "endedAt": "2026-09-28T12:00:00.000Z", "format": "SIX_MAX_100BB", "status": "COMPLETED", "contribution": ["VPIP"], "canOpenDetail": true, "canOpenReplay": true }
    ],
    "limitations": []
  }
}
```

### Null and limitation rules

- `null` means the metric cannot be calculated from authorized, valid observations.
- A zero denominator must include `ZERO_DENOMINATOR`.
- Missing public analytics input must include `DATA_UNAVAILABLE` and must not be treated as zero.
- A non-empty result with fewer than 30 observations includes `INSUFFICIENT_SAMPLE` for the affected metric.
- No-results responses have `eligibleHands: 0`, empty arrays, null unavailable summary results, and `NO_RESULTS`.

### Privacy rules

The response MUST NOT contain raw decks, private cards, hidden state, password data, internal source identifiers, unauthorized participant identities, or hands not covered by the requesting user's list policy. Analytics for a user with no access must be indistinguishable from no eligible data; IDs must not be enumerable.

### Existing navigation contracts

`relatedHands[].historyId` may navigate to:

- `GET /api/hand-history/:historyId`
- `GET /api/hand-history/:historyId/replay`

The client must use the existing authorization and error envelopes for those resources.

### Error envelope

```json
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication required"
  }
}
```
