<!--
Sync Impact Report
Version change: (none, template placeholder) → 1.0.0
Rationale: Initial ratification (MAJOR) — first concrete constitution replacing the generic scaffold.
Modified principles: n/a (initial adoption)
Added sections:
  - Preamble
  - Article I — Product Integrity (Principles 1-2)
  - Article II — Server Authority and Security (Principles 3-5)
  - Article III — Separation of Responsibilities (Principles 6-8)
  - Article IV — Poker Engine (Principles 9-10)
  - Article V — Poker Trainer and GTO (Principles 11-15)
  - Article VI — Extensibility (Principles 16-17)
  - Article VII — Multiplayer and Real-Time Architecture (Principles 18-20)
  - Article VIII — User and Social Systems (Principles 21-23)
  - Article IX — Data Integrity (Principles 24-25)
  - Article X — Testing (Principles 26-27)
  - Article XI — Development Process (Principles 28-30)
  - Article XII — Documentation (Principles 31-32)
  - Article XIII — Technology Independence (Principles 33-34)
  - Article XIV — Code Quality (Principles 35-37)
  - Article XV — Constitution Compliance (Governance)
  - Initial Development Priorities
  - Definition of Done
Removed sections: Generic 5-principle scaffold ([PRINCIPLE_1_NAME]..[PRINCIPLE_5_NAME], [SECTION_2_NAME], [SECTION_3_NAME])
Deferred TODOs:
  - TODO(RATIFICATION_DATE): No prior ratification date was supplied; the date this amendment was
    applied (2026-09-23) was used for both Ratified and Last Amended. Correct if an earlier
    informal adoption date should be recorded instead.
Templates requiring follow-up: none checked automatically in this run (no dependent template
files were located/modified as part of this command, per scope guard).
-->

# Poker Platform Constitution

## Preamble
This document defines the fundamental engineering principles, architectural constraints, quality standards, and development rules for the Poker Platform.

The project is a web-based Texas Hold'em No-Limit poker platform focused on two main experiences:

1. Real-time poker games using virtual chips.
2. A Poker Trainer designed to evaluate player decisions using a GTO-oriented strategy model.

This Constitution defines **how the system must be built and maintained**, rather than describing every individual product feature.

All specifications, implementation plans, tasks, and code must comply with these principles.

---

## Article I — Product Integrity

### Principle 1: The Poker Rules Are Authoritative
All poker rules and game-state transitions must be determined by the backend Poker Engine.

The frontend must never be considered authoritative for:

- Valid actions.
- Player turns.
- Pot sizes.
- Stack sizes.
- Card distribution.
- Hand results.
- Winner determination.
- Side pots.
- Tournament elimination.
- Blind progression.

The client may request an action, but the server must validate and execute that action.

### Principle 2: Virtual Chips Only
The initial product uses virtual chips and does not implement real-money gambling.

The architecture must nevertheless keep game logic, player balances, and transaction-like operations sufficiently separated so that future changes do not require rewriting the Poker Engine.

---

## Article II — Server Authority and Security

### Principle 3: Never Trust the Client
All data received from the frontend must be treated as untrusted.

The backend must validate:

- Authentication state.
- Authorization.
- Player identity.
- Room membership.
- Turn ownership.
- Action validity.
- Bet amount.
- Available stack.
- Tournament state.
- Game state transitions.

A malicious client must not be able to modify its own stack, reveal hidden cards, perform actions out of turn, or alter the game state.

### Principle 4: Private Information Must Remain Private
A player's private cards must never be transmitted to another player's client before those cards are legitimately revealed.

The server must send each client only the information that client is authorized to see.

### Principle 5: Secure Authentication
User passwords must never be stored in plaintext.

Authentication credentials must use an appropriate password hashing mechanism.

Authentication, authorization, session management, and sensitive endpoints must follow established security practices.

User-controlled input must always be validated and sanitized where appropriate.

---

## Article III — Separation of Responsibilities

### Principle 6: Clear Domain Boundaries
The system must maintain clear separation between major responsibilities.

At minimum, the architecture must distinguish between:

- Authentication and user management.
- Friendship system.
- Lobby and room management.
- Real-time communication.
- Poker Engine.
- Tournament Engine.
- Hand Evaluation.
- Equity Engine.
- Strategy Engine.
- Decision Evaluation.
- Persistence.
- Frontend presentation.

A module should not contain unrelated business logic merely for convenience.

### Principle 7: Poker Engine Independence
The Poker Engine must not depend on frontend implementation details.

It must be possible to test and execute the Poker Engine independently of the user interface.

The same Poker Engine should be reusable by:

- Real-time poker tables.
- Poker Trainer simulations.
- Automated tests.
- Future simulations or analysis tools.

### Principle 8: Strategy Engine Independence
The Strategy Engine must be independent from the UI and from the transport layer.

Changing the strategy data or strategy model must not require rewriting the poker table interface or the core rules of Texas Hold'em.

---

## Article IV — Poker Engine

### Principle 9: Deterministic and Testable Game Logic
Given the same valid game state, player actions, and controlled randomness, the Poker Engine must produce a predictable and reproducible result.

Core poker operations must have automated tests.

The engine must correctly handle:

- Deck creation.
- Shuffling.
- Hole cards.
- Community cards.
- Positions.
- Dealer button.
- Small blind.
- Big blind.
- Betting rounds.
- Fold.
- Check.
- Call.
- Bet.
- Raise.
- All-in.
- Pots.
- Side pots.
- Showdown.
- Hand evaluation.
- Pot distribution.
- Player elimination.
- Tournament progression.

### Principle 10: Valid State Transitions
The Poker Engine must prevent impossible game states.

Examples include:

- Acting when it is not the player's turn.
- Betting more chips than the player possesses.
- Checking when a call is required.
- Raising below the minimum allowed amount.
- Acting after folding.
- Acting after elimination.
- Revealing cards prematurely.
- Awarding the same pot twice.

Invalid state transitions must be rejected by the backend.

---

## Article V — Poker Trainer and GTO

### Principle 11: Separate Equity From Strategy
The system must distinguish between mathematical poker calculations and strategic recommendations.

The Equity Engine is responsible for calculations such as:

- Hand versus hand equity.
- Hand versus range equity.
- Range versus range equity.
- Outs.
- Probabilities.
- Pot odds.
- Expected value where applicable.

The Strategy Engine is responsible for strategic recommendations.

These systems must remain separate.

### Principle 12: No Arbitrary Poker Advice
The Poker Trainer must not invent strategic recommendations without a defined strategy model or data source.

Recommendations must be based on explicitly defined:

- Ranges.
- Frequencies.
- Game parameters.
- Stack sizes.
- Positions.
- Actions.
- Board states.
- Strategy assumptions.

The source and assumptions of strategy data must be documented.

### Principle 13: Mixed Strategies Are First-Class Concepts
The Trainer must support situations in which multiple actions can be strategically valid with different frequencies.

The system must not assume that every poker decision has exactly one correct action.

For example, a strategy may conceptually contain:

```
Check: 20%
Bet 33%: 60%
Bet 75%: 20%
```

The evaluation system must account for these frequencies.

### Principle 14: Decision Evaluation Must Be Contextual
A player's decision must be evaluated according to the complete relevant game state.

The evaluation may consider:

- Hole cards.
- Position.
- Number of players.
- Effective stack.
- Pot size.
- Board.
- Previous actions.
- Bet sizes.
- Opponent ranges.
- Equity.
- Pot odds.
- EV.
- Tournament context.
- Strategy frequencies.

The Trainer must not evaluate a decision solely from the player's two hole cards.

### Principle 15: Educational Feedback
The Trainer should explain why a decision is strategically relevant instead of merely labeling it as "correct" or "incorrect."

Feedback should identify important factors influencing the recommendation.

The system should distinguish between:

- Strongly preferred action.
- Mixed-strategy action.
- Acceptable alternative.
- Marginal decision.
- Significant strategic deviation.

---

## Article VI — Extensibility

### Principle 16: Build for Progressive Poker Complexity
The first Trainer implementation may focus on preflop decisions, but the architecture must support future analysis of:

1. Preflop.
2. Flop.
3. Turn.
4. River.

The addition of later streets must not require rewriting the fundamental game-state architecture.

### Principle 17: Configurable Game Parameters
Game configuration must not be hard-coded throughout the application.

The architecture should support configurable parameters such as:

- Number of players.
- Starting stack.
- Blind sizes.
- Ante.
- Tournament stage.
- Effective stack.
- Table size.
- Position.

The initial configuration is:

- Texas Hold'em.
- No-Limit.
- Tournament.
- 6–9 players.
- 100 BB starting stack.
- Virtual chips.

Future configurations should be possible without major architectural changes.

---

## Article VII — Multiplayer and Real-Time Architecture

### Principle 18: Server-Authoritative Multiplayer
Real-time poker games must use a server-authoritative architecture.

The frontend may display state and request actions, but the server owns the canonical game state.

All game actions must be validated on the server before they become part of the game.

### Principle 19: Consistent Game State
All connected clients must eventually receive a consistent representation of the authoritative game state.

Real-time communication must handle:

- Player connections.
- Disconnections.
- Reconnection.
- Room membership.
- Player actions.
- Game-state updates.
- Turn changes.
- Hand completion.

### Principle 20: Reconnection Must Be Considered
The architecture must not assume that a player will maintain a perfect network connection.

The system should be designed so that a disconnected player can reconnect and recover the appropriate authorized game state.

---

## Article VIII — User and Social Systems

### Principle 21: User Identity Is Centralized
Every authenticated user must have a unique identity that can be consistently associated with:

- Profile.
- Friends.
- Rooms.
- Tournament participation.
- Poker history.
- Trainer history.

### Principle 22: Friendship State Must Be Explicit
Friendship relationships must have explicit states and validation rules.

The system must prevent:

- Duplicate friendship relationships.
- Invalid self-friend requests.
- Conflicting pending requests.
- Unauthorized modifications.

### Principle 23: Authorization Must Be Explicit
Being authenticated does not automatically grant access to every resource.

The backend must verify that a user is authorized to:

- Access private rooms.
- View private information.
- Perform player-specific actions.
- Access personal statistics.
- Modify personal settings.

---

## Article IX — Data Integrity

### Principle 24: Persistence Must Reflect Domain State
Persistent data must accurately represent important domain entities and relationships.

Critical state changes should be handled atomically where necessary.

The system must avoid creating inconsistent records when operations partially fail.

### Principle 25: Historical Game Data Must Be Reproducible
Where practical, completed poker hands should preserve enough information to reconstruct and analyze the hand.

This is particularly important for:

- Trainer history.
- Hand review.
- Statistics.
- Debugging.
- Dispute investigation.
- Future analytical features.

---

## Article X — Testing

### Principle 26: Critical Logic Requires Automated Tests
Automated tests are mandatory for critical business logic.

At minimum, tests must cover:

- Hand evaluation.
- Pot calculation.
- Side pots.
- Betting rules.
- Turn order.
- Blind handling.
- All-in scenarios.
- Tournament elimination.
- Equity calculations.
- Strategy evaluation.
- Authentication rules.
- Authorization rules.

### Principle 27: Edge Cases Matter
Tests must include unusual but valid poker situations.

Examples:

- Multiple all-ins.
- Split pots.
- Side pots.
- Tied hands.
- Heads-up play after eliminations.
- Minimum raises.
- Players disconnecting.
- Last player remaining.
- Empty rooms.
- Reconnecting players.

A feature is not considered complete if it only works for the common case.

---

## Article XI — Development Process

### Principle 28: Incremental Development
The project must be developed in small, verifiable stages.

A new feature should not introduce large amounts of unrelated functionality.

Each stage should:

1. Define the required behavior.
2. Implement the smallest useful version.
3. Add tests.
4. Verify existing functionality.
5. Document important decisions.
6. Proceed to the next stage.

### Principle 29: Do Not Over-Engineer Prematurely
The architecture should support future expansion without implementing unnecessary complexity before it is required.

Prefer simple, explicit solutions when they satisfy current requirements.

Introduce additional abstraction only when there is a concrete reason.

### Principle 30: No Blind Code Generation
AI-generated code must not be accepted without understanding its purpose and verifying its correctness.

When using GitHub Copilot or other AI tools:

- Review generated code.
- Run tests.
- Verify security-sensitive code.
- Verify poker calculations.
- Check architectural consistency.
- Reject unnecessary dependencies.
- Avoid accepting large generated changes without understanding them.

AI is an implementation assistant, not the source of truth for the project's requirements or poker rules.

---

## Article XII — Documentation

### Principle 31: Important Decisions Must Be Documented
Architectural decisions that affect future development must be documented.

Examples:

- Why a technology was selected.
- How game state is represented.
- How WebSockets are used.
- How poker randomness is handled.
- How equity is calculated.
- What strategy model is being used.
- How GTO data is represented.
- How authentication works.

### Principle 32: Specifications Are the Source of Truth
The project's Spec Kit specifications must remain consistent with the actual intended behavior.

If requirements change, update the specification before implementing the change when practical.

Implementation should not silently redefine product requirements.

---

## Article XIII — Technology Independence

### Principle 33: Architecture Before Framework
Technology choices must serve the system requirements rather than determine them.

The Constitution does not mandate a specific:

- Frontend framework.
- Backend framework.
- Database.
- WebSocket library.
- Hosting provider.

These decisions belong in the implementation plan and must be justified according to the project requirements.

### Principle 34: Avoid Unnecessary Vendor Lock-In
Core poker rules, game state, strategy representation, and domain logic should remain portable where reasonably possible.

External services should be isolated behind clear interfaces when practical.

---

## Article XIV — Code Quality

### Principle 35: Readability Over Cleverness
Code must prioritize:

- Clear naming.
- Small cohesive functions.
- Explicit domain logic.
- Predictable behavior.
- Maintainability.

Complex code should have a clear reason to exist.

### Principle 36: Single Responsibility
A class, module, service, or function should have a clearly defined responsibility.

Avoid combining:

- Authentication logic with poker logic.
- Database access with UI logic.
- WebSocket handling with poker rules.
- Strategy calculations with presentation.
- Game rules with persistence details.

### Principle 37: Explicit Domain Models
Important poker concepts should have explicit representations rather than being passed around as loosely structured values.

Examples include:

- Player.
- Card.
- Deck.
- Hand.
- Range.
- Position.
- Action.
- Bet.
- Pot.
- Side Pot.
- Game State.
- Tournament State.
- Strategy Recommendation.

---

## Article XV — Constitution Compliance (Governance)
All future specifications and implementation plans must comply with this Constitution.

When a proposed implementation conflicts with a Constitutional Principle, the conflict must be explicitly identified and resolved before implementation.

Temporary exceptions must be documented with:

- The violated principle.
- The reason for the exception.
- The affected component.
- The intended resolution.
- Whether the exception is temporary or permanent.

**Amendment procedure**: Changes to this Constitution are proposed as an edit to this file, accompanied by a Sync Impact Report describing the version bump rationale and affected sections. Amendments should evolve only when there is a clear architectural or product reason to change a fundamental project principle.

**Versioning policy**: This Constitution follows semantic versioning:

- MAJOR: Backward incompatible governance/principle removals or redefinitions.
- MINOR: New principle/section added or materially expanded guidance.
- PATCH: Clarifications, wording, typo fixes, non-semantic refinements.

**Compliance review**: All specifications, plans, and pull requests must be checked against this Constitution before merging. Conflicts must be resolved or explicitly documented as a temporary exception before implementation proceeds.

---

## Initial Development Priorities
The initial implementation should prioritize correctness in the following order:

1. Secure authentication.
2. Correct Texas Hold'em rules.
3. Correct server-authoritative game state.
4. Correct multiplayer synchronization.
5. Correct tournament behavior.
6. Correct equity calculations.
7. Correct strategy representation.
8. Correct GTO-oriented decision evaluation.
9. Trainer explanations and educational UX.
10. Statistics and additional features.

Visual polish must not take priority over correctness of the poker engine and security.

---

## Definition of Done
A feature is considered complete only when:

- Its intended behavior is specified.
- The implementation follows the architecture.
- Security implications have been considered.
- Relevant automated tests exist.
- Existing functionality still works.
- Edge cases have been considered.
- Important architectural decisions are documented.
- The implementation does not violate this Constitution.

This Constitution is the permanent engineering foundation of the Poker Platform.

**Version**: 1.0.0 | **Ratified**: 2026-09-23 | **Last Amended**: 2026-09-23
