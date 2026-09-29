# Quickstart: Historial general de manos

## Prerequisites

- Node.js 20 or newer.
- PostgreSQL disponible mediante `backend/.env`.
- Migraciones existentes aplicadas.
- Un usuario autenticado y datos de prueba con manos terminadas de al menos dos usuarios.

## Prepare the backend

```powershell
Set-Location backend
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
```

Expected result: the client is generated and migrations apply without resetting existing data.
For an existing database that predates Prisma migration tracking, baseline the already-applied migrations with `npx.cmd prisma migrate resolve --applied <migration-id>` before running deploy. Never accept a schema reset when the `session` table created by `connect-pg-simple` is the only drift.

## Focused backend validation

```powershell
npm.cmd test -- --run tests/unit/hand-history tests/contract/hand-history tests/integration/hand-history
```

The focused suite must verify:

1. A terminal hand is published once even when its completion is retried.
2. Active or incomplete hands never appear as completed history.
3. List queries enforce authentication, page limits, deterministic order, date/format/result filters, and empty results.
4. Detail responses preserve action order, board, pots, results, and authorized reveals.
5. Foreign history IDs do not reveal existence or private data.
6. Raw decks, future cards, unrevealed opponent cards, and engine bookkeeping are absent from responses.
7. Privacy requests are idempotent and anonymize or restrict shared records according to policy.
8. Representative first-page queries meet the 95th-percentile one-second target.

## Frontend validation

```powershell
Set-Location ..\frontend
npm.cmd test -- --run tests/hand-history.test.tsx
npm.cmd run build
```

The frontend suite must cover loading, empty, filtered, paginated, unauthorized, detail, legacy limitation, and anonymized states. It must not render fields absent from the authorized response.

## Full regression validation

```powershell
Set-Location ..\backend
npm.cmd test -- --run
npm.cmd run build

Set-Location ..\frontend
npm.cmd test -- --run
npm.cmd run build
```

Expected result: existing authentication, rooms, multiplayer, preflop Trainer, postflop Trainer, equity, and strategy tests remain green.

## Manual authenticated flow

1. Sign in as Player A and create or identify a completed virtual hand.
2. Open `GET /api/hand-history` and confirm the completed hand appears once in the first page.
3. Apply date, format, result, participant, order, and page-size filters; confirm each returned row satisfies all filters.
4. Open `GET /api/hand-history/:historyId` and confirm actions are ordered and only authorized cards are visible.
5. Sign in as Player B and attempt to access Player A's history ID; confirm the response does not reveal existence or private data.
6. Repeat the terminal publication or privacy request; confirm no duplicate record or repeated mutation is created.
7. Verify an active hand is not listed until it reaches a terminal state.

See [contracts/hand-history-http.md](contracts/hand-history-http.md) and [data-model.md](data-model.md) for response and persistence details.

Feature roadmap: Feature 010 covers replay, Feature 011 covers analytics, Feature 012 covers administration, and Feature 013 covers multiplayer training. These are intentionally outside this history implementation.

In this Windows workspace, the authenticated flow is also covered by the contract and integration suites because no browser session is provisioned for manual sign-in. Those automated scenarios exercise the same list, detail, privacy, isolation, retry, and terminal-state checks described above.
