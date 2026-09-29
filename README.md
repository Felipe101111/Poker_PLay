## Feature 007

The Equity Engine provides deterministic exact Hold'em equity from server-authoritative cards and weighted concrete ranges. Strategy data is published through immutable version identities; missing contexts return `UNAVAILABLE` rather than guessed advice. See [specs/007-equity-engine-strategy/quickstart.md](specs/007-equity-engine-strategy/quickstart.md) for the integration contract.

## Feature 008

The Trainer now supports one authenticated postflop sequence across flop, turn, and river. The server owns the deck, board, legal actions, ranges, strategy context, and terminal state. Exact equity and versioned strategy are reported independently; unavailable strategy is explicit, and decisions remain reviewable as immutable ordered snapshots. The roadmap continues with Features 009-013 for general hand history, replay, analytics, administration, and multiplayer training.
# Poker Platform

The repository contains the Poker Platform backend and browser client. The current product includes authenticated accounts, friends, local Poker Engine hands, PostgreSQL-backed poker rooms, and real-time multiplayer tables.

Feature 009 adds authenticated hand-history list, filters, ordered detail, and privacy removal at `/api/hand-history`. The server persists only terminal snapshots and projects responses without raw decks or unauthorized private cards. See [specs/009-hand-history/quickstart.md](specs/009-hand-history/quickstart.md) for the contract and validation flow.

Feature 010 adds the read-only replay endpoint `GET /api/hand-history/:historyId/replay` and the browser replay at `/hand-history/:historyId/replay`. Replay events are projected server-side in sequence order; unavailable legacy states and privacy redactions are returned as explicit limitations rather than reconstructed by the client. See [specs/010-hand-replay/quickstart.md](specs/010-hand-replay/quickstart.md) for focused validation.

Feature 011 adds the authenticated analytics dashboard at `/analytics` and `GET /api/hand-history/analytics`. The server aggregates only terminal histories covered by the requesting user's `canList` policy and returns summary, real-versus-EV trend, VPIP/PFR/3-bet/win-rate metrics, position/street breakdowns, limitations, and bounded related hands. Missing `publicSnapshot.analytics` data is returned as `null` with `DATA_UNAVAILABLE`; gains and EV are never inferred from pot or result fields. Date, format, and `relatedLimit` filters apply to every section. See [specs/011-analytics-dashboard/quickstart.md](specs/011-analytics-dashboard/quickstart.md) and [specs/011-analytics-dashboard/contracts/hand-analytics-http.md](specs/011-analytics-dashboard/contracts/hand-analytics-http.md).

Feature 012 adds versioned strategy administration at `/api/strategy/admin` and `/strategy/administration`. Editorial roles are global (`EDITOR`, `REVIEWER`, `PUBLISHER`, `ADMIN`), drafts use optimistic revisions, and only validated drafts can be published. Published versions are immutable; retirement, role assignment, publication, and validation are auditable. Apply the Feature 012 migration with `backend\npm.cmd run prisma:migrate:deploy` before using the administration routes. See [specs/012-strategy-administration/quickstart.md](specs/012-strategy-administration/quickstart.md) for the complete workflow.

Feature 005 adds server-authoritative multiplayer tables at `/api/rooms/:roomId/table`. Started rooms reuse the Poker Engine through authenticated HTTP and Socket.IO flows, with per-user private-card projections, transactional actions, reconnect recovery, presence timeout folding, and virtual chips only. See [specs/005-multiplayer-poker/quickstart.md](specs/005-multiplayer-poker/quickstart.md) for migration and validation.

See [backend/README.md](backend/README.md) for setup and API details, [specs/003-poker-engine/quickstart.md](specs/003-poker-engine/quickstart.md) for local-hand validation, [specs/005-multiplayer-poker/quickstart.md](specs/005-multiplayer-poker/quickstart.md) for multiplayer validation, and [specs/006-poker-trainer/quickstart.md](specs/006-poker-trainer/quickstart.md) for trainer validation.