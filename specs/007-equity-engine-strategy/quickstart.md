# Poker Platform Feature 007 Quickstart

This guide validates the Equity Engine, weighted ranges, and versioned strategy boundary before the postflop Trainer work in the combined 008/009 feature.

## Prerequisites

- Node.js 20 or newer.
- PostgreSQL available through the repository `DATABASE_URL` when persistence integration tests are enabled.
- Backend and frontend dependencies installed.
- Existing migrations for Features 001-006 applied.

## Automated validation

From the repository root:

```powershell
cd backend
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
npm.cmd test -- --run tests/unit/equity tests/unit/strategy
npm.cmd run build
cd ..\frontend
npm.cmd test -- --run
npm.cmd run build
```

The implementation should add focused tests for:

- Exact hand-versus-hand equity with a known winner.
- Ties, split equity, and probability bounds.
- Hand-versus-range and range-versus-range weighted aggregation.
- Combo expansion, canonical ordering, invalid weights, blockers, normalization, and empty ranges.
- Repeated identical calculations producing the same fingerprint and result.
- Strategy publication, version isolation, retirement, and immutable historical snapshots.
- Missing strategy rows returning `UNAVAILABLE` without fabricated recommendations.
- Trainer integration keeping equity, strategy frequencies, classification, and explanation separate.
- Authorization and projection preventing private cards, decks, or mutable source data from crossing the user boundary.

## Manual validation scenarios

1. Run the unit suite for card, combo, range, equity, and strategy modules.
2. Calculate a known hand-versus-hand case and confirm probabilities are between 0 and 1, ties are explicit, and the method is `EXACT`.
3. Calculate a hand-versus-range case with a board blocker. Confirm incompatible combos are removed, remaining weight is reported, and no weight is silently redistributed.
4. Repeat the same normalized request and confirm the result fingerprint and values are stable.
5. Publish or load two strategy dataset versions for the same context. Confirm each returns its own frequencies and assumptions.
6. Request a context absent from a version. Confirm `UNAVAILABLE` is returned and no action or category is invented.
7. Evaluate a Trainer decision. Confirm the result separates equity, strategy version, frequencies, classification, and explanation.
8. Verify a historical evaluation still contains the original strategy snapshot after a newer version is available.
9. Run the performance sample for representative exact calculations and record p95. The target is at least 95% under 2 seconds in the reference environment.

## Completion criteria

- All equity and range invariants pass.
- All strategy versions are immutable after publication.
- Historical snapshots are reproducible and user-authorized.
- Existing Feature 006 tests remain green.
- No postflop Trainer UI, tournament behavior, real-money behavior, or external solver integration is introduced by Feature 007.
