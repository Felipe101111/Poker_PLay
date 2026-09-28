# Equity and Strategy Contracts

Feature 007 exposes pure domain contracts to the Trainer. Transport endpoints are not required for the first increment; authenticated Trainer flows remain the user-facing boundary. Any future HTTP adapter must preserve these shapes and authorization rules.

## Equity Engine Contract

### Input: `EquityAnalysisRequest`

```json
{
  "street": "flop",
  "board": [
    { "rank": "A", "suit": "s" },
    { "rank": "7", "suit": "h" },
    { "rank": "2", "suit": "d" }
  ],
  "participants": [
    {
      "id": "hero",
      "holding": {
        "cards": [
          { "rank": "K", "suit": "s" },
          { "rank": "Q", "suit": "s" }
        ]
      }
    },
    {
      "id": "villain",
      "range": {
        "label": "villain-range",
        "combos": [
          {
            "cards": [
              { "rank": "A", "suit": "h" },
              { "rank": "K", "suit": "h" }
            ],
            "weight": 1
          }
        ]
      }
    }
  ],
  "method": "EXACT",
  "precision": 0.000001
}
```

Rules:

- `board` card count must match `street`.
- Every card across board, holdings, and active range combos must be unique.
- Each participant must provide a concrete holding or a non-empty weighted range.
- `method` is `EXACT` in Feature 007. Unknown methods are rejected rather than silently approximated.
- The engine returns no strategy recommendation.

### Output: `EquityAnalysisResult`

```json
{
  "method": "EXACT",
  "precision": 0.000001,
  "runoutsEvaluated": 990,
  "participants": [
    { "id": "hero", "winProbability": 0.41, "equity": 0.43 },
    { "id": "villain", "winProbability": 0.57, "equity": 0.57 }
  ],
  "tieProbability": 0.02,
  "blockedComboCount": 2,
  "remainingWeight": { "villain": 0.84 },
  "inputFingerprint": "stable-normalized-input-fingerprint"
}
```

Invalid input returns a typed validation error containing a stable code, field/path, and human-readable correction. No partial recommendation is returned.

## Range Contract

- `Combo.cards` contains exactly two canonically ordered distinct cards.
- `Combo.weight` is finite and in `[0, 1]`.
- Blocker filtering returns active combos, removed combo count, and remaining weight.
- Normalization is explicit and returns the applied factor.
- An empty active range is a valid filtering result but cannot be submitted to equity calculation without an explicit caller policy.

## Strategy Engine Contract

### Lookup input: `StrategyLookupRequest`

```json
{
  "datasetVersion": "preflop-v1",
  "contextKey": "6max|100bb|BTN|open|AKs",
  "gameFormat": "SIX_MAX_100BB_PREFLOP",
  "street": "preflop"
}
```

### Lookup output: available

```json
{
  "availability": "AVAILABLE",
  "dataset": {
    "version": "preflop-v1",
    "schemaVersion": "1",
    "source": "documented-bounded-dataset",
    "assumptions": ["..."],
    "contentHash": "..."
  },
  "row": {
    "contextKey": "6max|100bb|BTN|open|AKs",
    "actions": [
      { "action": { "type": "raise", "amountBB": 2.5 }, "frequency": 0.8 },
      { "action": { "type": "fold" }, "frequency": 0.2 }
    ],
    "factors": ["position", "effective stack"],
    "assumptions": ["..."],
    "range": null
  }
}
```

### Lookup output: unavailable

```json
{
  "availability": "UNAVAILABLE",
  "datasetVersion": "preflop-v1",
  "contextKey": "missing-context",
  "reason": "NO_COMPATIBLE_STRATEGY_ROW"
}
```

`UNAVAILABLE` is a valid domain result. It must not be converted into a guessed action, category, or frequency.

## Trainer Integration Contract

The Trainer submits a server-derived `EvaluationContext` to both engines independently. The combined result must keep these fields separate:

- `equity`: quantitative result or unavailable state.
- `strategy`: dataset/version/row or `UNAVAILABLE`.
- `classification`: optional decision category based on strategy frequencies.
- `explanation`: factors and assumptions from the resolved strategy and context.
- `snapshot`: immutable references and values used for the result.

The client cannot select the strategy version by sending arbitrary dataset contents, override private cards, or replace server-derived ranges. Historical decisions retain the dataset and row snapshot used at evaluation time.

## Error Codes

- `INVALID_CARD_STATE`: duplicate, missing, or impossible cards.
- `INVALID_RANGE`: malformed range, combo, or weight.
- `EMPTY_RANGE`: no active combos remain for a required participant.
- `UNSUPPORTED_CALCULATION_METHOD`: method is not supported by the current release.
- `STRATEGY_VERSION_NOT_FOUND`: requested version does not exist.
- `NO_COMPATIBLE_STRATEGY_ROW`: strategy is unavailable for the context.
- `EVALUATION_CONTEXT_INVALID`: game context cannot be evaluated.
