# Data Model: Analytics de rendimiento de poker

## Existing source entities

### HandHistory

Existing terminal historical hand. Analytics reads `id`, `sourceType`, `format`, `status`, `startedAt`, `endedAt`, `publicSnapshot`, participants and actions.

- Only terminal statuses are eligible.
- The user must have an authorized `HistoryAccessPolicy`.
- No analytics-specific persistence is added in the MVP.

### HandAction

Existing ordered public action with `sequence`, `street`, `seatNumber`, `actionType`, `amount`, `publicStateAfter` and `occurredAt`.

- Actions are ordered by `sequence`, not by timestamp.
- Only actions and states visible to the requesting user contribute to metrics.
- Missing or malformed public state produces a limitation, not an inferred value.

### HistoryAccessPolicy

Existing per-user authorization and redaction profile.

- `canList` controls whether the hand can contribute to analytics.
- `canViewDetail` controls drill-down links to detail/replay.
- `redactionProfile` determines which participant and state data may be used.

## Derived response entities

### AnalyticsFilter

Request query and effective scope.

| Field | Type | Rules |
|---|---|---|
| `from` | ISO date, optional | Inclusive lower bound on `endedAt` |
| `to` | ISO date, optional | Inclusive upper bound; must not precede `from` |
| `format` | string, optional | Exact existing hand format |
| `relatedLimit` | integer, optional | Bounded 1-50; default 20 |

The response echoes normalized `from`, `to`, `format`, and the number of eligible hands.

### AnalyticsLimitation

Explains missing or insufficient data.

| Field | Type | Rules |
|---|---|---|
| `code` | `INSUFFICIENT_SAMPLE \| ZERO_DENOMINATOR \| DATA_UNAVAILABLE \| NO_RESULTS \| PRIVACY_REDACTION` | Stable client-readable code |
| `message` | string | User-safe explanation |
| `metric` | string, optional | Metric affected when applicable |
| `position` | string, optional | Position affected when applicable |
| `street` | string, optional | Street affected when applicable |

### MetricValue

A frequency or result metric.

| Field | Type | Rules |
|---|---|---|
| `value` | number or null | Ratio or result; null when no valid denominator |
| `numerator` | integer | Count contributing to the numerator |
| `denominator` | integer | Count eligible for this metric |
| `sampleThreshold` | integer | Default 30 for frequency metrics |
| `isSufficient` | boolean | True only when denominator meets threshold and data is valid |

### PerformanceSummary

- `handsPlayed`: integer
- `netResult`: number or null
- `evResult`: number or null
- `winRate`: `MetricValue`
- `roi`: `MetricValue` or null when stake/buy-in data is unavailable
- `netResultAvailable`: boolean
- `evAvailable`: boolean

### TrendPoint

- `periodStart`: ISO date
- `periodEnd`: ISO date
- `hands`: integer
- `netResult`: number or null
- `evResult`: number or null

Points are ordered ascending by period and use a stable daily aggregation for ranges up to 90 days; longer ranges may use calendar weeks.

### DecisionMetrics

Contains `vpip`, `pfr`, `threeBet`, and `winRate`, each as `MetricValue`, plus a `scope` of `ALL`, `PREFLOP`, `FLOP`, `TURN`, or `RIVER`.

### BreakdownRow

- `key`: position or street value
- `hands`: integer
- `metrics`: `DecisionMetrics`
- `limitations`: `AnalyticsLimitation[]`

Rows are sorted by a fixed poker position/street order, then alphabetically for unknown historical values.

### RelatedHand

- `historyId`: string
- `endedAt`: ISO date
- `format`: string
- `status`: string
- `contribution`: list of metric names that include the hand
- `canOpenDetail`: boolean
- `canOpenReplay`: boolean

No private cards, raw state, or other participant identity is embedded.

### AnalyticsDocument

- `filters`: effective `AnalyticsFilter`
- `summary`: `PerformanceSummary`
- `trend`: `TrendPoint[]`
- `overall`: `DecisionMetrics`
- `byPosition`: `BreakdownRow[]`
- `byStreet`: `BreakdownRow[]`
- `relatedHands`: `RelatedHand[]`
- `limitations`: `AnalyticsLimitation[]`

## Public snapshot analytics input

Existing `publicSnapshot` may contain an optional public `analytics` object:

- `netResult`: number
- `evResult`: number
- `vpipEligible`: boolean
- `vpipSelected`: boolean
- `pfrEligible`: boolean
- `pfrSelected`: boolean
- `threeBetEligible`: boolean
- `threeBetSelected`: boolean
- `winEligible`: boolean
- `won`: boolean
- `position`: string
- `streetMetrics`: redacted, public per-street metric observations

Unknown keys remain ignored and sensitive keys are never projected. Absence of this object produces `DATA_UNAVAILABLE` rather than a fabricated value.
