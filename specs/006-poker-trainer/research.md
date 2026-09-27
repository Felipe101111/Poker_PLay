# Research: Poker Trainer Preflop Decisions

## Decision: Use a bounded, versioned in-project strategy dataset

- Rationale: The first release must be deterministic, auditable, and independent of an external solver or network service. A versioned dataset supports mixed frequencies, documented assumptions, and repeatable tests.
- Alternatives considered: An external strategy service adds availability and versioning risk; a full local solver is outside the preflop-only scope and would increase complexity.

## Decision: Generate scenarios with a persisted server-side seed

- Rationale: The existing Poker Engine accepts a controlled seed through `startHand`, so the server can generate varied scenarios while preserving exact replay and auditability. The persisted scenario snapshot remains the player-visible source of truth.
- Alternatives considered: A fixed scenario sequence limits variety; unseeded randomness prevents reliable debugging and deterministic tests.

## Decision: Reuse the existing Poker Engine for legal actions and card validity

- Rationale: Constitution principles require one authoritative rules implementation. `startHand` and the engine's legal-action computation already model six-player hands, blinds, stacks, hole cards, and preflop state.
- Alternatives considered: Reimplementing trainer legality would duplicate rules and create drift between table play and training.

## Decision: Add a dedicated Express/Prisma trainer module

- Rationale: Existing modules separate routes, validation, services, repositories, and projections. A trainer module keeps strategy evaluation and educational explanations independent from transport and UI while reusing session authentication and shared errors.
- Alternatives considered: Extending local-games or multiplayer would mix unrelated lifecycle and persistence semantics.

## Decision: Enforce one active session with a database uniqueness rule

- Rationale: Repeated starts and concurrent requests must be idempotent. A partial unique index on `training_sessions(user_id) WHERE status = 'ACTIVE'`, plus a transaction, provides a database-level guarantee that Prisma schema annotations alone cannot express.
- Alternatives considered: An application-only pre-check is race-prone; allowing multiple active sessions violates the clarified product behavior.

## Decision: Persist immutable scenario and evaluation snapshots

- Rationale: Completed results must remain reviewable even if the strategy dataset evolves. Store the scenario context, seed, strategy version, selected action, category, frequencies, and explanation snapshot with each decision.
- Alternatives considered: Recomputing historical results from the current dataset would make progress and explanations change over time.

## Decision: Record unsupported strategy as `UNAVAILABLE`

- Rationale: The player may complete a valid practice action without receiving fabricated advice. The result is retained for activity history but excluded from preferred, acceptable, marginal, and significant-deviation counts.
- Alternatives considered: Blocking the action reduces practice continuity; silently treating it as a deviation violates the no-arbitrary-advice principle.

## Decision: Use authenticated HTTP contracts for the first increment

- Rationale: Session resume, decision submission, progress, and next-scenario flows do not require realtime transport. HTTP contracts are simpler to test and align with the existing API client.
- Alternatives considered: Socket.IO would add lifecycle complexity without a requirement for live multi-user updates.
