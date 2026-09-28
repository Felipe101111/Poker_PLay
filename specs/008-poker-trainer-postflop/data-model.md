# Data Model: Poker Trainer postflop completo

## TrainingSession

Extiende la sesión del Trainer para identificar si la progresión es preflop o postflop.

| Field | Type | Rules |
|---|---|---|
| id | UUID | Identificador estable |
| userId | UUID | Debe pertenecer al usuario autenticado |
| format | enum | `SIX_MAX_100BB_PREFLOP` o `SIX_MAX_100BB_POSTFLOP` |
| status | enum | `ACTIVE` o `COMPLETED` |
| currentScenarioId | UUID? | Solo el escenario activo de la sesión |
| startedAt/updatedAt/completedAt | timestamp | Estado temporal de la sesión |

Relationships: one user has many sessions; one session has ordered scenarios.

## TrainingScenario

Snapshot inmutable de un punto de decisión postflop.

| Field | Type | Rules |
|---|---|---|
| id | UUID | Identificador estable |
| sessionId | UUID | FK a la sesión propietaria |
| sequence | positive integer | Única dentro de la sesión y ordena las calles |
| generationSeed | integer | Permite reproducir el escenario |
| engineSnapshot | JSON | Estado completo interno; nunca se proyecta sin filtrar |
| holeCards | JSON | Solo las cartas privadas del jugador autenticado |
| position | string | Posición derivada del engine |
| street | enum | `flop`, `turn`, `river` o estado terminal asociado |
| board | JSON | Board visible derivado del snapshot |
| potBB | number | Bote visible en big blinds |
| effectiveStackBB | number | Positivo y derivado del estado |
| blindContext | JSON | Ciegas vigentes |
| priorActions | JSON | Acciones previas autorizadas |
| legalActions | JSON | Acciones calculadas por el engine |
| strategyKey | string | Clave canónica de lookup por contexto |
| strategyVersion | string? | Versión resuelta o null |
| terminalReason | enum? | `FOLD`, `ALL_IN`, `SHOWDOWN`, `COMPLETE` |
| createdAt | timestamp | Momento de creación |

Invariants:

- Board has exactly 3, 4, or 5 cards for flop, turn, or river.
- All visible, private, and engine cards are unique.
- A postflop scenario is generated only from a valid preflop transition.
- `legalActions` is empty or terminal when no seat can act.
- The client cannot supply or overwrite derived fields.

## TrainingDecision

Resultado inmutable de una acción en un escenario.

| Field | Type | Rules |
|---|---|---|
| id | UUID | Stable result id |
| scenarioId | UUID | One effective decision per scenario/user |
| userId | UUID | Must match session owner |
| selectedAction | JSON | Action validated against stored legal actions |
| evaluationStatus | enum | `EVALUATED` or `UNAVAILABLE` |
| category | enum? | Mixed-strategy-aware classification |
| recommendationSnapshot | JSON? | Resolved action frequencies and source |
| explanationSnapshot | JSON | Factors, assumptions, equity, blockers, limitations |
| strategyVersion | string? | Version used at evaluation time |
| requestId | string | Idempotency key |
| completedAt | timestamp | Immutable completion time |

## EvaluationSnapshot

Registro append-only para reproducibilidad de una evaluación.

- `contextSnapshot`: street, board, position, stack, pot, actions and calculation configuration.
- `equitySnapshot`: result, runouts, precision, blockers and remaining weights.
- `strategyVersionSnapshot`: complete version metadata and assumptions.
- `strategyRowSnapshot`: resolved row, ranges, actions and factors.
- `classification`: final category when available.
- `availability`: `AVAILABLE`, `UNAVAILABLE`, or `INVALID_INPUT`.
- `calculationFingerprint`: normalized input fingerprint.
- `scenarioId`: link to the TrainingScenario when generated from Trainer.

## State Transitions

```text
POSTFLOP_SCENARIO_READY
  -> DECISION_PERSISTED
  -> NEXT_STREET_SCENARIO_READY
  -> DECISION_PERSISTED
  -> NEXT_STREET_SCENARIO_READY
  -> TERMINAL_RESULT
```

Allowed street transitions are `flop -> turn -> river`; a terminal engine state ends the sequence. A retry of a persisted decision returns the original result and does not create a second transition.
