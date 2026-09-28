## Feature 007

The Equity Engine provides deterministic exact Hold'em equity from server-authoritative cards and weighted concrete ranges. Strategy data is published through immutable version identities; missing contexts return `UNAVAILABLE` rather than guessed advice. See [specs/007-equity-engine-strategy/quickstart.md](specs/007-equity-engine-strategy/quickstart.md) for the integration contract.

## Feature 008

The Trainer now supports one authenticated postflop sequence across flop, turn, and river. The server owns the deck, board, legal actions, ranges, strategy context, and terminal state. Exact equity and versioned strategy are reported independently; unavailable strategy is explicit, and decisions remain reviewable as immutable ordered snapshots. Feature 009 is intentionally merged into this sequence. The roadmap continues with Features 010-014 for general hand history, replay, analytics, administration, and multiplayer training.
# Poker Platform

The repository contains the Poker Platform backend and browser client. The current product includes authenticated accounts, friends, local Poker Engine hands, PostgreSQL-backed poker rooms, and real-time multiplayer tables.

See [backend/README.md](backend/README.md) for setup and API details, [specs/003-poker-engine/quickstart.md](specs/003-poker-engine/quickstart.md) for local-hand validation, [specs/005-multiplayer-poker/quickstart.md](specs/005-multiplayer-poker/quickstart.md) for multiplayer validation, and [specs/006-poker-trainer/quickstart.md](specs/006-poker-trainer/quickstart.md) for trainer validation.