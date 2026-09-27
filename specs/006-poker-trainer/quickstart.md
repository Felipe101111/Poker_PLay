# Poker Trainer Quickstart

This guide validates the first preflop trainer increment end to end. It covers authenticated session creation, reproducible scenario generation, legal decision evaluation, idempotent retry, unavailable strategy data, recovery, and personal progress.

## Prerequisites

- Node.js 20 or newer.
- PostgreSQL running with the repository `DATABASE_URL`.
- Backend and frontend dependencies installed.
- Existing auth and database migrations applied.

From the repository root:

```powershell
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm test
npm run build
cd ..\frontend
npm install
npm test -- --run
npm run build
```

## Manual flow

1. Start the backend with `cd backend; npm run dev` and the frontend with `cd frontend; npm run dev`.
2. Register and log in through the existing authentication pages.
3. Open the Poker Trainer route and start the default session.
4. Confirm the scenario shows six-player context, 100 BB default stack, position, blinds, hole cards, prior actions, and legal actions. Confirm no future board, raw deck, or opponent private cards are visible.
5. Refresh or start training again. Confirm the same active session and scenario are returned rather than a duplicate.
6. Submit a displayed legal action. Confirm the result shows the selected action, strategy version/frequencies when available, category, and explanation factors.
7. Repeat the exact request with the same `requestId`. Confirm the same decision is returned and no second decision is created.
8. Continue to the next scenario. Confirm the previous result remains in history and a new seeded scenario is active.
9. Open progress. Confirm counts include only the authenticated user's decisions and unavailable results are excluded from strategic category counts.
10. Log in as a second user and confirm the first user's session, decisions, explanations, and progress are inaccessible.

## Automated acceptance scenarios

The trainer implementation should add contract and integration tests for:

- `POST /api/trainer/session/start` creates one valid seeded six-max scenario and is idempotent for an active session.
- Scenario snapshots contain unique cards, coherent preflop action history, legal actions, and no hidden information in the response.
- Legal decisions persist once; illegal, stale, foreign, and malformed requests do not mutate the active scenario.
- Mixed strategy frequencies classify acceptable alternatives without requiring the most frequent action.
- Missing strategy data returns `UNAVAILABLE`, stores no fabricated recommendation, and does not increment category counts.
- Concurrent start and decision requests preserve one active session and one decision through database constraints and transactions.
- Progress is user-scoped and returns a genuine empty state for a new account.

## Performance check

Measure normal session-start requests in a representative local or staging environment. The feature target is a decision-ready response under 5 seconds for at least 95% of normal attempts. Record the observed result with the validation run.
