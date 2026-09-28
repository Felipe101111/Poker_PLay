# Quickstart: Poker Trainer postflop completo

## Prerequisites

- Node.js 20 or newer.
- PostgreSQL available through `backend/.env`.
- Existing Feature 006 and 007 migrations applied.
- Authenticated test user or the repository's test fixtures.

## Prepare the backend

```powershell
Set-Location backend
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
```

Expected result: Prisma client generation succeeds and all migrations are applied without reset.

## Run focused backend validation

```powershell
npm.cmd test -- --run tests/unit/trainer-postflop tests/integration/trainer-postflop.test.ts tests/contract/trainer-postflop.test.ts tests/contract/trainer-postflop-security.test.ts tests/performance/trainer-postflop-performance.test.ts
```

The focused suite must verify:

1. Deterministic flop, turn, and river boards with unique cards.
2. Legal-action validation against the server-derived state.
3. Sequential continuation and terminal fold/all-in behavior.
4. Exact equity, blockers, strategy versions, mixed frequencies, and explicit unavailable states.
5. Idempotent retries and concurrent decision protection.
6. No raw deck, future board, opponent cards, client ranges, or strategy overrides in responses.
7. p95 evaluation time within the target from the spec for representative scenarios.

## Run backend regression validation

```powershell
npm.cmd test
npm.cmd run build
```

Expected result: Feature 006 preflop behavior and all existing backend tests remain green.

## Run frontend validation

```powershell
Set-Location ..\frontend
npm.cmd test -- --run
npm.cmd run build
```

The frontend suite must verify board/street rendering, legal action controls, loading/error states, separate equity and strategy sections, unavailable limitations, continuation, terminal results, keyboard access, and refresh recovery.

The implementation also preserves the existing `/api/trainer/session/*` preflop endpoints. Postflop clients use `/api/trainer/postflop/session/start`, `/api/trainer/postflop/session`, `/api/trainer/postflop/session/decisions`, and `/api/trainer/postflop/session/next`.

## Manual authenticated flow

1. Start a postflop session.
2. Confirm the first scenario is a flop with only authorized hole cards and visible board cards.
3. Submit a legal flop action and record the decision id.
4. Request the next scenario and confirm the board advances to turn.
5. Repeat for river, unless the hand ends earlier.
6. Refresh the session and verify the ordered results remain available.
7. Attempt a foreign scenario, a stale decision, a forged board, and a client-supplied strategy version; each must fail without changing persisted state.

See [trainer-postflop-http.md](contracts/trainer-postflop-http.md) and [data-model.md](data-model.md) for response and persistence details.
