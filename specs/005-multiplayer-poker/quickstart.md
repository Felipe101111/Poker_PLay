# Feature 005 Quickstart

This guide validates the multiplayer table behavior end to end. It assumes the feature 001 authentication, feature 002 friendship, feature 003 Poker Engine, and feature 004 room flows are available.

## Prerequisites

- Node.js 20 or newer.
- PostgreSQL 16 running with the repository database configured.
- Backend dependencies installed in `backend/`.
- Frontend dependencies installed in `frontend/`.
- `backend/.env` configured with `DATABASE_URL`, `SESSION_SECRET`, and `FRONTEND_ORIGIN`.

## Prepare the database

From `backend/`:

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate:deploy
```

Use the repository's existing migration workflow. Do not reset the database.

## Run the application

Start the backend:

```powershell
cd backend
npm.cmd run dev
```

Start the frontend in a second terminal:

```powershell
cd frontend
npm.cmd run dev
```

Open the frontend URL shown by Vite.

## Scenario 1: Enter a live table

1. Register and authenticate at least two users.
2. Create a room with at least two seats and a valid starting stack/blind configuration.
3. Join the room from the second account, mark all members ready, and start the room as host.
4. Open the table from both authenticated clients.
5. Verify both clients show the same public table state and current turn.
6. Verify each client sees its own hole cards while the other player's cards remain hidden.

Expected result: one active table exists for the started room, with one fixed seat per member and a shared authoritative hand state.

## Scenario 2: Submit and synchronize actions

1. From the client whose turn it is, submit a legal fold, check, call, bet, raise, or all-in action.
2. Observe the updated stack, pot, legal actions, street, and next turn from both clients.
3. Submit an action from the client that is not acting.
4. Submit a stale action using an earlier hand/version.
5. Retry the same accepted action with the same request ID.

Expected result: the legal action produces exactly one state transition and a broadcast to both clients. Out-of-turn, stale, and duplicate requests are rejected or returned idempotently without duplicate cards, pots, or actions.

## Scenario 3: Reconnect and timeout

1. Disconnect one client during an active hand.
2. Reconnect it within 60 seconds.
3. Verify the client receives the newest authorized snapshot and retains its seat.
4. Disconnect the acting client and leave it disconnected beyond 60 seconds.
5. Observe the table from another client.

Expected result: the reconnecting client recovers without a duplicate seat. After the grace period, the acting player's hand is automatically folded once and the table advances.

## Scenario 4: Complete hands and eliminate players

1. Play a hand to a fold win or showdown.
2. Verify all members see the final board, legitimately revealed cards, hand result, pot awards, and updated stacks.
3. Continue through another hand to verify dealer/blind rotation.
4. Drive a participant's stack to zero and complete the hand.
5. Verify the participant remains in completed results but cannot act in a later hand.
6. Reduce the table to fewer than two eligible players.

Expected result: the table closes, preserves completed results, and rejects further hand actions.

## Automated validation

From `backend/`:

```powershell
npm.cmd test -- --run
npm.cmd run build
npm.cmd run lint
```

From `frontend/`:

```powershell
npm.cmd test -- --run
npm.cmd run build
```

The implementation is ready for review when the feature's multiplayer contract/integration tests cover the scenarios above, all existing feature tests remain green, and the builds complete without type errors.

## Validation status

- Prisma migration deployment completed with no pending migrations.
- Frontend tests (34/34), frontend build, frontend lint, backend build, backend lint, and the focused multiplayer suites pass.
- The full backend suite retains one pre-existing failure in `tests/unit/strategy/strategy-lookup.test.ts` (`AVAILABLE` expected, `UNAVAILABLE` received); this is outside Feature 005.
- The result contract now covers fold wins, showdown reveals, ties, side-pot awards, updated stacks, completed-result visibility, and immutable results.
- T058 remains open because the full backend suite retains the unrelated strategy baseline failure and the interactive quickstart scenarios were not run end to end in this session.

See [data-model.md](data-model.md), [contracts/table-http.md](contracts/table-http.md), and [contracts/realtime-events.md](contracts/realtime-events.md) for the state and interface details used by these checks.
