# Phase 0 Research: Poker Engine (Local Single-Hand Play)

This feature reuses features 001/002's Node/TypeScript/Express backend and React frontend for the HTTP/UI layer — see their research.md files for those foundational decisions. Only decisions specific to the Poker Engine and this feature's local-hotseat delivery are documented below. No open `NEEDS CLARIFICATION` markers remain.

## Decision: The Poker Engine is a pure, dependency-free TypeScript module

- **Rationale**: Constitution Principle 7 requires the Poker Engine to be testable and reusable independent of the UI, and explicitly names both the future real-time tables and the Poker Trainer as consumers. The only way to guarantee that later is to make `backend/src/poker-engine/` import nothing beyond its own types and the Node standard library — no Express `Request`/`Response`, no Prisma, no `zod`. All HTTP/session concerns live in `backend/src/modules/local-games/`, which imports the engine, not the other way around.
- **Alternatives considered**:
  - *Build the rules directly inside `local-games.service.ts`*: Faster to write today, but ties the rules to this feature's HTTP/session shape, directly contradicting Principle 7 and guaranteeing a costly extraction later when multiplayer/Trainer need the same rules.

## Decision: In-memory storage (`Map<userId, HandState>`), not PostgreSQL

- **Rationale**: The spec's Assumptions explicitly state hand history is not persisted in this feature. A local, single-user, single-active-hand session has no need for durability across restarts. Using Prisma/PostgreSQL here would add migration/schema work for data that, per the spec, doesn't need to survive anything.
- **Alternatives considered**:
  - *Persist `LocalHand` rows in PostgreSQL like `User`/`FriendRequest`*: Would satisfy a *future* hand-history feature's needs but is explicitly out of scope now (Constitution Principle 29 — do not over-engineer prematurely); revisit when the roadmap's history/statistics feature (Etapa 16) is built.

## Decision: Seat-scoped responses via an explicit `asSeat` parameter, not a "narrator" omniscient view

- **Rationale**: FR-003/FR-017 require that a request "on behalf of" a seat only ever sees that seat's own hole cards, with every other seat's hole cards redacted until showdown — even though the same authenticated user is driving every seat in hotseat mode. Modeling this as "which seat am I currently viewing as" (an explicit `asSeat` query parameter on every read) forces the HTTP layer to exercise the exact same redaction logic that a real multiplayer server would need per-connection, so that behavior transfers unchanged later.
- **Alternatives considered**:
  - *Return all hole cards always, since it's the same human anyway*: Simpler, but would mean this feature never actually validates the information-hiding rule that Constitution Principle 4 and the future multiplayer feature depend on — defeating a core purpose of building a "local" version first.

## Decision: Hand evaluation via brute-force best-of-21 combinations, not a lookup-table evaluator

- **Rationale**: A 7-card hand has exactly C(7,5) = 21 possible 5-card combinations. Ranking all 21 with a straightforward 5-card evaluator and keeping the best is simple, obviously correct, and easy to unit test exhaustively — and at the scale of one local hand at a time (not thousands of hands/second), performance is a non-issue (Constitution Principle 29).
- **Alternatives considered**:
  - *Perfect-hash / lookup-table evaluators (e.g., Cactus Kev-style)*: Dramatically faster (used in Monte Carlo equity simulations), but that speed is only needed by the future Equity Engine (roadmap Etapa 11), not by playing one local hand. Revisit if/when the Equity Engine needs high-volume evaluation.

## Decision: Seedable PRNG (mulberry32-style) for shuffling, not Node's `crypto` module

- **Rationale**: FR-002 requires shuffling to be reproducible when a seed is supplied (for automated tests) while still being unpredictable in normal play. A tiny, self-contained PRNG seeded from `crypto.randomInt` when no explicit seed is given satisfies both: deterministic tests pass a fixed seed; real play gets a fresh, non-reproducible seed. Constitution Principle 2 confirms this product uses virtual chips with no real-money gambling, so a cryptographically-certified RNG is not a compliance requirement here.
- **Alternatives considered**:
  - *Always use `crypto.getRandomValues`*: Cryptographically stronger, but not seedable, which would make FR-002's reproducible-test requirement impossible to satisfy directly (tests would need to mock the RNG module instead of passing a seed through the engine's own API).

## Decision: Side pots computed from each seat's total contribution, not a running "call stack" of all-in amounts

- **Rationale**: The standard, well-tested approach — sort distinct contribution levels among seats still in the hand, and build one pot per level (capped at that level, contested by every seat that contributed at least that much) — directly matches FR-009's requirement and is straightforward to unit test with tables of contributions and expected pot splits.
- **Alternatives considered**: None seriously — this is the standard algorithm for the problem; the only "alternative" would be an ad hoc, harder-to-verify implementation.
