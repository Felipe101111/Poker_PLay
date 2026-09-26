# Implementation Plan: Poker Engine (Local Single-Hand Play)

**Branch**: `003-poker-engine` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-poker-engine/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

An authenticated user starts a local, hotseat-mode Texas Hold'em hand (2-9 seats, 100 BB stacks), drives every seat's actions through a REST API, and the engine deals cards, enforces turn order and action legality, advances betting rounds automatically, and resolves showdown (including side pots and split pots) — all backed by a **pure, framework-agnostic Poker Engine module** that has zero dependency on Express/HTTP, so it can be unit-tested in complete isolation and reused unchanged by the future real-time multiplayer feature and the Poker Trainer (Constitution Principle 7). Technical approach: the engine lives in `backend/src/poker-engine/` as pure TypeScript types and functions operating on an in-memory `HandState`; a thin `backend/src/modules/local-games/` HTTP module holds one active hand per user in a process-local `Map` (no database — the spec explicitly excludes hand persistence for this feature) and translates requests/responses, redacting hole cards per the requesting seat until showdown.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+ (backend, unchanged from features 001/002); TypeScript + React 18 (frontend, unchanged).

**Primary Dependencies**: No new runtime dependencies. The engine itself (shuffling, dealing, betting rules, pot math, hand evaluation) is implemented as pure TypeScript with no external packages — a small hand-written seedable PRNG (a few lines, e.g. mulberry32) is used instead of adding a dependency, per Constitution Principle 29. The HTTP layer reuses Express 4 + `zod` from feature 001.

**Storage**: In-memory only (a `Map<userId, HandState>` inside the running Node process) — **not** PostgreSQL. This is a deliberate deviation from features 001/002's persistent storage, directly required by the spec's Assumptions ("Hand history is not persisted to a database in this feature"). Documented tradeoff: state does not survive a server restart and would not work across multiple backend instances; acceptable now because this feature is single-user/local and a future hand-history feature (roadmap Etapa 16) will introduce real persistence when it's actually needed.

**Testing**: Vitest, heavily weighted toward fast, dependency-free **unit tests** of the pure engine (deck/shuffle determinism, blind posting, turn order, legal-action computation, pot/side-pot math, hand ranking, tie splitting), plus a smaller set of Supertest **contract/integration tests** for the HTTP layer, following features 001/002's conventions (`fileParallelism: false` only matters for the DB-backed auth/friends suites — the engine's own unit tests have no shared-state concerns).

**Target Platform**: Same containerized Linux server + evergreen browsers as features 001/002 (no new infrastructure).

**Project Type**: Web application (frontend + backend split) — extends the existing `backend/` and `frontend/` projects.

**Performance Goals**: A single engine operation (shuffle+deal, action validation, showdown evaluation for up to 9 seats) completes in well under 50ms server-side — this is simple in-memory computation with no I/O, so this is a generous, easily-met bound rather than a tight target.

**Constraints**: The `backend/src/poker-engine/` module MUST NOT import Express, `zod`, Prisma, or any other framework/HTTP/storage package — it depends only on its own types and the Node standard library, so it can be imported and tested (or reused by the Trainer/multiplayer features) with zero HTTP/database setup (Constitution Principle 7). No response for a given seat may include another seat's hole cards before a legitimate showdown (FR-003, Constitution Principle 4).

**Scale/Scope**: One active `LocalHand` per authenticated user at a time (FR-012), fully in-memory; no multi-instance/horizontal-scale concerns for this feature.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| P1 — Poker rules are authoritative | All game-state transitions (deal, blinds, actions, streets, showdown, pot award) happen inside the engine on the server; the client only requests actions and displays whatever state the server returns. | PASS |
| P3 — Never trust the client | Every action is re-validated server-side against the current `HandState` (turn order, legality, amounts) regardless of what the UI enables (FR-013). | PASS |
| P4 — Private information stays private | Hole cards are redacted per requesting seat in every response until showdown (FR-003, FR-017); the raw `HandState` (including other seats' cards and the remaining deck) never crosses the HTTP boundary unredacted. | PASS |
| P6 — Clear domain boundaries | `poker-engine/` (pure rules) is a distinct top-level module from `modules/local-games/` (HTTP/session concerns) and from `modules/auth/`/`modules/friends/` — no unrelated logic mixed in. | PASS |
| P7 — Poker Engine independence | `poker-engine/` has zero Express/Prisma/HTTP dependencies; it is directly unit-testable and is the same module the future real-time multiplayer feature and Poker Trainer will import. | PASS |
| P9 — Deterministic and testable game logic | Shuffling accepts an optional seed for reproducible tests; given the same seed and action sequence, the engine always produces the same resulting state. | PASS |
| P10 — Valid state transitions | `computeLegalActions`/`applyAction` reject out-of-turn, under-funded, below-minimum-raise, and illegal-check attempts without mutating state (FR-006). | PASS |
| P29 — Do not over-engineer prematurely | In-memory storage (no DB) and a straightforward 21-combination 7-card hand evaluator are chosen over a persistent store or a premium lookup-table evaluator, matching this feature's actual (single local hand, no history) requirements. | PASS |

No violations. Re-checked after Phase 1 design below.

## Project Structure

### Documentation (this feature)

```text
specs/003-poker-engine/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── poker-engine/                  # NEW — pure, framework-agnostic (Constitution P7)
│   │   ├── types.ts                   # Card, Deck, Seat, HandState, Pot, Action, BettingRound
│   │   ├── rng.ts                     # seedable PRNG (mulberry32-style, no dependency)
│   │   ├── deck.ts                    # createDeck, shuffle(seed?), dealHoleCards, dealCommunityCards
│   │   ├── betting.ts                 # computeLegalActions, applyAction, isRoundComplete
│   │   ├── pots.ts                    # computePots (main + side pots from contributions)
│   │   ├── hand-evaluator.ts          # evaluate7CardHand, compareHandRanks, splitPotAmounts
│   │   └── engine.ts                  # startHand, submitAction, abandonHand (orchestration)
│   └── modules/
│       ├── auth/                      # feature 001 (unchanged)
│       ├── friends/                   # feature 002 (unchanged)
│       └── local-games/               # NEW — HTTP layer for this feature
│           ├── local-games.routes.ts  # /api/local-games/*
│           ├── local-games.service.ts # in-memory Map<userId, HandState>, seat-redaction
│           └── local-games.validation.ts
└── tests/
    ├── unit/poker-engine/             # deck, betting, pots, hand-evaluator tests (no HTTP/DB)
    ├── contract/                      # local-games HTTP contract tests
    └── integration/                   # full-hand-to-showdown, all-in/side-pot flows

frontend/
├── src/
│   ├── pages/
│   │   └── LocalGamePage.tsx          # table view, seat switcher (hotseat), action buttons
│   └── services/
│       └── localGameApi.ts
└── tests/
    └── unit/
```

**Structure Decision**: Extends the existing web application split — no new top-level projects. The key structural decision is splitting the Poker Engine into its own top-level `backend/src/poker-engine/` (pure rules, zero framework dependencies) separate from `backend/src/modules/local-games/` (the HTTP/session-specific wrapper for *this* feature's hotseat delivery). This lets `poker-engine/` be imported directly, unchanged, by the future multiplayer and Poker Trainer features (Constitution Principle 7) without carrying this feature's HTTP/in-memory-session concerns along with it.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations to justify.

## Post-Design Constitution Re-Check

*Performed after Phase 1 (data-model.md, contracts/, quickstart.md).*

- `data-model.md`'s `HandState` keeps the full deck and all seats' hole cards server-side only; `contracts/local-games-api.md` confirms every response is redacted per the requesting seat until showdown — P4 holds.
- `poker-engine/` (per data-model.md's module boundaries) still has no contracts/routes/DB references — the contracts and quickstart operate on it only through the `local-games` HTTP layer, confirming P6/P7 were not compromised during design.
- `contracts/local-games-api.md`'s legal-actions field and abandon endpoint fully cover FR-016/FR-017 without needing any new storage beyond the in-memory map — P29 holds.
- No new violations introduced by the design artifacts. **Gate: PASS.**
