# Data Model: Equity Engine y estrategia versionada

## Domain Value Objects

### Card

The existing Poker Engine `Card` value object remains canonical.

- `rank`: valid Hold'em rank.
- `suit`: one of the four suits.
- A card identity is the pair `(rank, suit)`.
- A calculation rejects duplicate card identities.

### Combo

A concrete two-card holding.

- `cards`: exactly two distinct cards in canonical order.
- `weight`: decimal proportion in `[0, 1]`.
- `sourceWeight`: original weight before blocker filtering or explicit normalization.
- `blocked`: whether known cards removed the combo from the active set.

A combo cannot contain duplicate cards or two cards in a non-canonical order.

### Range

A weighted collection of concrete combos and its source metadata.

- `id`: stable analysis-local identifier.
- `label`: human-readable name.
- `combos`: concrete weighted combos.
- `normalizationFactor`: present only when an explicit normalization was applied.
- `totalWeight`: active remaining weight after filtering.
- `sourceNotation`: optional source notation for auditability.

Validation rejects negative, non-finite, or out-of-range weights, duplicate combos, malformed source notation, and a range that becomes empty when a calculation requires at least one active combo.

### BoardState

Known community cards and the street they represent.

- `street`: `preflop`, `flop`, `turn`, or `river`.
- `cards`: zero, three, four, or five cards according to street.
- `knownCards`: board plus all explicitly known hole cards.

The card count must match the street and all cards must be unique.

### EquityCalculation

Immutable quantitative result of a calculation.

- `id`: calculation identifier.
- `method`: `EXACT` for the initial implementation.
- `precision`: declared result precision.
- `runoutsEvaluated`: number of evaluated legal runouts.
- `participants`: participant identifiers and weighted inputs.
- `winProbability`: per-participant probability.
- `tieProbability`: probability of a tie or split result.
- `equity`: per-participant share after ties/splits.
- `blockedComboCount`: number of removed combos.
- `remainingWeight`: active range weight after blockers.
- `inputFingerprint`: stable fingerprint of normalized inputs.
- `createdAt`: creation time.

Equity and probabilities are bounded from 0 to 1, and the declared result totals must satisfy the calculation invariant within the documented precision.

## Strategy Entities

### StrategyDatasetVersion

Immutable publication containing one coherent strategy source.

- `id`: stable publication identifier.
- `version`: human-readable version such as `preflop-v1`.
- `schemaVersion`: structure version.
- `gameFormat`: Hold'em parameters supported by the dataset.
- `street`: supported street.
- `tableSize`: supported player count or range.
- `stackAssumptions`: effective stack parameters.
- `blindAssumptions`: blind and ante parameters.
- `source`: provenance and source description.
- `contentHash`: optional integrity identifier.
- `assumptions`: documented interpretation assumptions.
- `precision`: strategy frequency precision.
- `status`: `PUBLISHED` or `RETIRED`.
- `publishedAt`: publication time.
- `retiredAt`: optional retirement time.

A published version is immutable. A revision creates a new publication identity.

### StrategyRow

One strategy lookup row within a dataset version.

- `id`: stable row identifier.
- `datasetVersionId`: parent publication.
- `contextKey`: canonical key built from relevant game context.
- `range`: optional weighted range associated with the row.
- `actions`: action/frequency pairs with explicit mixed-strategy support.
- `factors`: educational factors.
- `assumptions`: row-specific assumptions.
- `conditions`: constraints required for applicability.

Frequencies are non-negative, finite, and normalized according to the dataset contract. Missing or incompatible rows resolve to `UNAVAILABLE`.

### EvaluationContext

Immutable input that joins game context with analysis inputs.

- `scenarioId`: optional Trainer scenario reference.
- `street` and `gameFormat`.
- `heroCards` and known board.
- `opponentRanges` or explicit opponent holdings.
- `position`, `tableSize`, and `effectiveStackBB`.
- `priorActions` and pot/blind context.
- `strategyVersion`: requested or default dataset version.
- `calculationConfig`: method and precision settings.

The context is derived server-side from an authorized scenario; clients cannot supply private engine snapshots as authoritative inputs.

### EvaluationSnapshot

Historical result preserving enough information to reproduce an evaluation.

- `id`: immutable evaluation identifier.
- `contextSnapshot`: normalized authorized context.
- `equitySnapshot`: resolved EquityCalculation or declared unavailable/error state.
- `strategyVersionSnapshot`: complete dataset metadata used.
- `strategyRowSnapshot`: resolved row, actions, frequencies, factors, and assumptions.
- `classification`: optional Trainer category.
- `availability`: `AVAILABLE`, `UNAVAILABLE`, or `INVALID_INPUT`.
- `createdAt`: creation time.

Historical snapshots are append-only. Dataset retirement or later publications must not alter them.

## Relationships

- A `StrategyDatasetVersion` contains many `StrategyRow` records.
- An `EvaluationContext` resolves at most one dataset version and one compatible strategy row.
- An `EvaluationSnapshot` records one context, one equity result, and zero or one strategy row snapshot.
- A Trainer decision may reference one EvaluationSnapshot while retaining the existing user ownership boundary.
- Future flop, turn, and river scenarios reuse `Range`, `BoardState`, `EvaluationContext`, and `EvaluationSnapshot` without changing the meaning of existing preflop records.

## State Transitions

### Strategy Dataset Version

`DRAFT` -> `PUBLISHED` -> `RETIRED`

- Only a valid draft can be published.
- `PUBLISHED` data cannot be edited; corrections create a new version.
- `RETIRED` data remains readable for historical snapshots but is not selected as the default for new evaluations.

### Evaluation

`PENDING` -> `AVAILABLE`

`PENDING` -> `UNAVAILABLE`

`PENDING` -> `INVALID_INPUT`

- `AVAILABLE` requires valid equity and a compatible strategy row.
- `UNAVAILABLE` may contain valid equity but no strategy row; no recommendation is fabricated.
- `INVALID_INPUT` is never persisted as a completed recommendation and must include actionable validation details.
