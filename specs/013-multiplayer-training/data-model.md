# Feature 013 Data Model: Entrenamiento multijugador

## MultiplayerTrainingSession

Represents the training overlay for one started multiplayer table.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary identity. |
| `tableId` | UUID | Required; unique one-to-one relation with `MultiplayerTable`. |
| `format` | String/enum | Initial format is six-player Texas Hold'em No-Limit with virtual chips. |
| `status` | `ACTIVE`, `COMPLETED`, or `CANCELLED` | `ACTIVE` while the table can capture decisions; terminal after the table closes or training is cancelled. |
| `createdById` | UUID | Authenticated creator; server-owned. |
| `createdAt` | timestamp | Creation time. |
| `completedAt` | timestamp nullable | Set once the associated training session becomes terminal. |

**Constraints**:

- One training session per multiplayer table.
- Only members of the associated started room may create or join it.
- A table action can be captured for training only after the participant is enrolled.
- Training status cannot reopen after terminal completion.

## MultiplayerTrainingParticipant

Represents one enrolled player and the private feedback boundary.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary identity. |
| `trainingSessionId` | UUID | Required relation to `MultiplayerTrainingSession`. |
| `tableParticipantId` | UUID | Required and unique relation to `TableParticipant`. |
| `userId` | UUID | Server-resolved identity; must match the table participant. |
| `status` | `ENROLLED`, `LEFT`, or `REMOVED` | Controls whether new accepted actions create decisions. |
| `joinedAt` | timestamp | Enrollment time. |
| `leftAt` | timestamp nullable | Set when the user leaves training while remaining a table member. |

**Constraints**:

- Unique `(trainingSessionId, tableParticipantId)` and `(trainingSessionId, userId)`.
- A participant can read only their own decisions and feedback.
- Leaving training does not silently remove the user from the poker table; it stops future decision capture according to the documented policy.

## MultiplayerTrainingDecision

Represents one accepted player action and its private training result.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary identity. |
| `trainingSessionId` | UUID | Required relation to the training session. |
| `participantId` | UUID | Required relation to the enrolled participant. |
| `handId` | UUID | Required relation to the authoritative multiplayer hand. |
| `tableActionId` | UUID | Required and unique relation to the accepted `TableAction`. |
| `userId` | UUID | Server-resolved actor; indexed for private queries. |
| `sequence` | integer | Accepted action sequence copied from the hand. |
| `street` | `PREFLOP`, `FLOP`, `TURN`, or `RIVER` | Street at decision time. |
| `decisionContextSnapshot` | JSON | Own hole cards, public board, pot, stacks, position, prior public actions, legal actions, and visible context before the action. Never stores opponent private cards or raw deck. |
| `selectedAction` | JSON | Server-normalized accepted action and amount. |
| `evaluationStatus` | `EVALUATED` or `UNAVAILABLE` | Explicit result availability. |
| `category` | nullable enum | Preferred, acceptable mixed, marginal, or significant deviation when evaluated. |
| `equitySnapshot` | JSON | Server-derived equity result and calculation metadata, or an explicit unavailable limitation. |
| `strategyVersionSnapshot` | JSON nullable | Immutable version identity and compatibility metadata used for this evaluation. |
| `strategyRowSnapshot` | JSON nullable | Immutable strategy row/frequencies used for this evaluation. |
| `explanationSnapshot` | JSON | Factors, assumptions, limitations, and privacy-safe explanation. |
| `calculationFingerprint` | string nullable | Stable identity of the calculation inputs and strategy snapshot. |
| `createdAt` | timestamp | Server time at accepted action. |

**Constraints**:

- Unique `tableActionId` prevents duplicate feedback for a retried action.
- Unique `(handId, userId, sequence)` prevents duplicate sequence capture.
- The decision is created only for an accepted action, in the same transaction as that action.
- Decision fields are immutable after creation; a later strategy publication cannot rewrite them.
- No response exposes another participant's decision, context, equity, strategy row, or explanation.

## EvaluationSnapshot Extension

The existing `EvaluationSnapshot` remains the common immutable storage for user-owned evaluations. Feature 013 adds an optional unique relation to `MultiplayerTrainingDecision` and a source discriminator or source id sufficient to distinguish multiplayer decisions from individual Trainer scenarios.

The snapshot must preserve:

- Authenticated user id.
- Decision context visible at action time.
- Server-derived equity result.
- Strategy version and row snapshots when available.
- Availability and limitations.
- Calculation fingerprint.

## Relationships

```text
PokerRoom 1 ── 1 MultiplayerTable
MultiplayerTable 1 ── 1 MultiplayerTrainingSession
MultiplayerTable 1 ── N TableParticipant
MultiplayerTrainingSession 1 ── N MultiplayerTrainingParticipant
TableParticipant 1 ── 0..1 MultiplayerTrainingParticipant
MultiplayerHand 1 ── N TableAction
TableAction 1 ── 0..1 MultiplayerTrainingDecision
MultiplayerTrainingParticipant 1 ── N MultiplayerTrainingDecision
MultiplayerTrainingDecision 1 ── 0..1 EvaluationSnapshot
MultiplayerHand 1 ── 0..1 HandHistory
```

## State Transitions

```text
MultiplayerTrainingSession: ACTIVE -> COMPLETED
MultiplayerTrainingSession: ACTIVE -> CANCELLED
MultiplayerTrainingParticipant: ENROLLED -> LEFT
MultiplayerTrainingParticipant: ENROLLED -> REMOVED
MultiplayerTrainingDecision: created once after accepted action; immutable thereafter
```

- A training session becomes `COMPLETED` when the associated table publishes its terminal hand and no more actions are accepted.
- A table can continue playing after an individual participant leaves training; that participant receives normal table projections but no new private training feedback.
- A table close and terminal history publication must be idempotent.

## Invariants

1. The table and Poker Engine remain the only source of truth for game state.
2. Every captured decision points to one accepted action and one authenticated table participant.
3. Every decision context contains only information the acting participant was authorized to know at the time.
4. Every available evaluation points to the exact strategy/equity snapshot used; unavailable evaluations never contain fabricated recommendations.
5. Public table, hand-history, replay, and analytics projections never include private training feedback.
6. Replaying an action request cannot create another table transition, decision, evaluation snapshot, or terminal history.
