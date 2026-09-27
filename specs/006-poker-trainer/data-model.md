# Data Model: Poker Trainer Preflop Decisions

## TrainingSession

Represents one authenticated player's practice context.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key. |
| `userId` | UUID | Required foreign key to `User`; all reads are user-scoped. |
| `format` | enum/string | First release value: `SIX_MAX_100BB_PREFLOP`. |
| `status` | enum | `ACTIVE` or `COMPLETED`. |
| `currentScenarioId` | UUID nullable | Current unanswered scenario; unique when present. |
| `startedAt` | timestamp | Server-generated. |
| `updatedAt` | timestamp | Server-generated. |
| `completedAt` | timestamp nullable | Set when the session is explicitly completed or superseded by the next lifecycle state. |

Constraints: one active session per user, enforced by a PostgreSQL partial unique index on `user_id` where `status = 'ACTIVE'`. Starting an active session returns it unchanged. Deleting another user's session is forbidden.

## TrainingScenario

An immutable, reproducible preflop decision situation.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key. |
| `sessionId` | UUID | Required foreign key to `TrainingSession`. |
| `sequence` | integer | Monotonic scenario number within a session. |
| `generationSeed` | integer | Server-generated; persisted for exact replay. |
| `engineSnapshot` | JSON | Server-authoritative engine state needed to validate the decision; never returned raw. |
| `holeCards` | JSON | Authenticated player's two cards only in public projection. |
| `position` | string | Six-max position at the decision point. |
| `tableSize` | integer | Always `6` in the first release. |
| `effectiveStackBB` | integer | Positive; default `100`. |
| `blindContext` | JSON | Small blind, big blind, and relevant blind metadata. |
| `priorActions` | JSON | Ordered legal action history leading to the decision point. |
| `legalActions` | JSON | Server-computed action set and amount bounds. |
| `strategyKey` | string | Canonical lookup key for the bounded dataset. |
| `strategyVersion` | string nullable | Dataset version used for lookup, null when unavailable. |
| `createdAt` | timestamp | Server-generated. |

Constraints: cards are unique; no future board is stored in the player projection; engine snapshot and legal actions are not client-writable. A scenario belongs to exactly one session and exactly one user through the session relation.

## TrainingDecision

An immutable result for one scenario and one player.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key. |
| `scenarioId` | UUID | Required foreign key; unique with `userId`. |
| `userId` | UUID | Required foreign key; must match scenario owner. |
| `selectedAction` | enum/JSON | Must be one of the scenario's legal actions, including amount where applicable. |
| `evaluationStatus` | enum | `EVALUATED` or `UNAVAILABLE`. |
| `category` | enum nullable | `PREFERRED`, `ACCEPTABLE_MIXED`, `MARGINAL`, `SIGNIFICANT_DEVIATION`; null for unavailable. |
| `recommendationSnapshot` | JSON nullable | Preferred actions and frequencies from the dataset. |
| `explanationSnapshot` | JSON | Educational factors and assumptions; no invented advice. |
| `strategyVersion` | string nullable | Version used for the evaluation. |
| `completedAt` | timestamp | Server-generated. |
| `requestId` | string | Client retry key; unique per scenario and user. |

Constraints: unique `(scenarioId, userId)` and `(scenarioId, userId, requestId)`; repeated submissions return the existing result. A rejected illegal action creates no decision.

## StrategyRecommendation

Logical representation of an entry in the versioned in-project dataset rather than player-owned mutable data.

- `version`: immutable dataset release identifier.
- `key`: format, position, stack band, blind context, prior-action class, and hole-card/range class.
- `actions`: action plus recommendation frequency, totaling 100% when supported.
- `assumptions`: documented game and strategy assumptions.
- `factors`: explanation labels used by the evaluator.

Missing keys produce `UNAVAILABLE`; they never fall back to arbitrary advice.

## ProgressSummary

Derived, authenticated aggregate over the user's completed `TrainingDecision` rows.

- `completedDecisions`: includes evaluated and unavailable decisions.
- `preferred`, `acceptableMixed`, `marginal`, `significantDeviation`: evaluated-category counts only.
- `unavailable`: unavailable-evaluation count.
- `byAction`: counts grouped by selected action.

## State transitions

```text
TrainingSession: ACTIVE -> COMPLETED
TrainingScenario: ACTIVE/unanswered -> COMPLETED through one TrainingDecision
TrainingDecision: created once; immutable thereafter
```

The next-scenario operation commits the previous decision and creates the next active scenario atomically. A failed decision leaves the active scenario unchanged.
