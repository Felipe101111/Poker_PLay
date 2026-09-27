# Feature Specification: Poker Trainer Preflop Decisions

**Feature Branch**: `006-poker-trainer`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "006" (interpreted from the roadmap and constitution as the first Poker Trainer increment: authenticated preflop decision practice)

## Clarifications

### Session 2026-09-26

- Q: ¿Qué fuente debe usar la primera versión para evaluar las decisiones preflop? → A: Dataset inicial acotado, versionado y mantenido dentro del proyecto.
- Q: ¿Cómo debe generar el sistema los escenarios para equilibrar variedad y reproducibilidad? → A: Generación pseudoaleatoria server-side con semilla persistida por escenario.
- Q: ¿Qué debe ocurrir cuando un jugador solicita iniciar entrenamiento mientras ya tiene una sesión activa sin decisión completada? → A: Devolver la sesión activa existente y su escenario actual.
- Q: ¿Qué debe ocurrir cuando un escenario válido no tiene datos de estrategia suficientes para evaluarlo? → A: Permitir la decisión, guardar el resultado como no evaluable y excluirlo de las categorías estratégicas.
- Q: ¿Qué formato de mesa debe usar la primera versión del Poker Trainer? → A: Mesa fija de 6 jugadores, 100 BB y estructura de ciegas estándar.

The first release uses a bounded, versioned strategy dataset maintained within the project so evaluations remain deterministic and auditable without an external strategy service. Scenarios are generated pseudo-randomly by the server and persist their generation seed for exact reproduction.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start a training session (Priority: P1)

An authenticated player starts a training session and receives a complete preflop poker scenario with private cards, position, stack, table size, blind context, and the action history that leads to the decision.

**Why this priority**: A trustworthy scenario is the foundation for every training decision and ensures the player practices a meaningful poker situation rather than an arbitrary card quiz.

**Independent Test**: Start a session repeatedly and verify that every scenario contains valid cards, a legal position, a valid stack and blind context, and a decision point that can be acted on.

**Acceptance Scenarios**:

1. **Given** an authenticated player has no active training session, **When** they start training with the default format, **Then** the system presents one complete preflop scenario with hole cards, position, table size, effective stack, blind context, prior actions, and the actions available at the decision point.
2. **Given** an authenticated player already has an active session without a completed decision, **When** they start training again, **Then** the system returns that session and its existing scenario without creating a duplicate session or scenario.
3. **Given** a scenario is displayed, **When** the player inspects it, **Then** all information needed to make the decision is visible and the scenario does not reveal a future board or hidden information that would not be known at the decision point.
4. **Given** a player starts another scenario after completing the current one, **When** the next scenario is generated, **Then** it is a new valid decision situation and does not reuse the previous decision as the active scenario.
5. **Given** a valid scenario has no matching strategy data, **When** the player submits a legal action, **Then** the system records the decision as unavailable without inventing advice or counting it as preferred, acceptable, marginal, or a significant deviation.

### User Story 2 - Submit a preflop decision (Priority: P1)

The player chooses one legal action for the current scenario and receives an evaluation that compares the decision with the defined strategy recommendation for that exact situation.

**Why this priority**: The value of the Trainer comes from connecting a player's decision to a defensible strategic evaluation.

**Independent Test**: Present a deterministic scenario, submit each available action, and verify that the system accepts only valid actions and produces an evaluation tied to the scenario and selected action.

**Acceptance Scenarios**:

1. **Given** a player is viewing an active scenario, **When** they submit one of the displayed legal actions, **Then** the decision is recorded once and an evaluation is returned for that action.
2. **Given** a player submits an action that is not legal for the current scenario, **When** the system evaluates the request, **Then** it rejects the decision without changing the active scenario or recording a result.
3. **Given** a player retries an already submitted decision, **When** the retry is received, **Then** the system returns the existing evaluation without creating a duplicate decision.
4. **Given** a scenario has a mixed strategy with multiple acceptable actions, **When** the player chooses any action within the accepted strategy range, **Then** the evaluation identifies it as strategically acceptable and does not label it as an error solely because it was not the most frequent action.

### User Story 3 - Understand the result and continue practice (Priority: P2)

After submitting a decision, the player sees an understandable explanation of the preferred actions, the selected action's strategic category, the important factors, and the option to continue with another scenario.

**Why this priority**: Educational feedback turns an isolated correctness result into repeatable learning and is required for the Trainer to provide value beyond a quiz.

**Independent Test**: Complete a scenario with a known recommendation and verify that the result explains the recommendation, distinguishes mixed or alternative actions, and starts a new scenario only after the result is available.

**Acceptance Scenarios**:

1. **Given** a decision has been evaluated, **When** the player views the result, **Then** the result identifies the selected action, the recommended action or action distribution, the strategic classification, and the main factors influencing the recommendation.
2. **Given** the selected action is a valid mixed-strategy alternative, **When** the result is shown, **Then** the explanation acknowledges that the action can be acceptable and includes its relative recommendation frequency when available.
3. **Given** a player chooses to continue, **When** the next scenario is requested, **Then** the previous result remains associated with the completed decision and a fresh active scenario is shown.
4. **Given** the player leaves and later returns to training, **When** they request their current session, **Then** they can recover the active scenario or the most recent completed result without losing the recorded decision.

### User Story 4 - Review personal training progress (Priority: P3)

The player reviews a summary of completed preflop decisions to identify recurring weaknesses and measure practice activity.

**Why this priority**: Progress review improves retention and makes the Trainer useful beyond a single session, while remaining separate from the core decision-evaluation loop.

**Independent Test**: Complete several deterministic scenarios with different evaluation categories and verify that the summary counts only the authenticated player's completed decisions and groups them by category and action.

**Acceptance Scenarios**:

1. **Given** a player has completed training decisions, **When** they open their progress view, **Then** they see counts for completed decisions, strategically preferred decisions, acceptable alternatives, and significant deviations.
2. **Given** two players have completed separate training sessions, **When** either player views progress, **Then** each player sees only their own records.
3. **Given** no decisions have been completed, **When** the player opens progress, **Then** the system shows an empty state without fabricated scores or recommendations.

### Edge Cases

- A scenario generator must not create impossible or duplicate cards, invalid positions, negative stacks, or an action history that conflicts with the displayed decision point.
- A request must be rejected if its scenario does not belong to the authenticated player's active session.
- A player must not submit two decisions for the same scenario or replace a completed evaluation by changing the request payload.
- A session interrupted before a decision is submitted must be recoverable without silently recording an action.
- A strategy recommendation must distinguish unavailable strategy data from a strategically poor decision; the system must not invent a recommendation when required strategy data is missing.
- A player with no history must receive an explicit empty progress state.
- Future postflop scenarios must not be implied by a preflop-only result or displayed as available functionality in this feature.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow an authenticated player to start, resume, and complete a preflop training session; repeated starts while a session is active MUST return that existing session and scenario idempotently.
- **FR-002**: System MUST generate server-side preflop scenarios for the first-release six-player table format with a persisted generation seed, valid hole cards, a 100 BB default effective stack, standard blind context, legal position, and prior actions consistent with the decision point.
- **FR-003**: System MUST show only information that would be available to the player at the preflop decision point and MUST NOT reveal future community cards or unavailable opponent information.
- **FR-004**: System MUST present the complete set of actions that are legal for the current scenario.
- **FR-005**: System MUST accept a decision only when the selected action is legal for the active scenario and belongs to the authenticated player's session.
- **FR-006**: System MUST evaluate each submitted decision against the documented, versioned strategy dataset included in the first release, identifying preferred actions and their recommendation frequencies where mixed strategies apply.
- **FR-007**: System MUST classify an evaluated decision using at least these categories: preferred, acceptable mixed-strategy alternative, marginal, and significant deviation.
- **FR-008**: System MUST provide an explanation that identifies the relevant factors for the evaluation, including position, effective stack, prior action, blind context, and the strategic role of the selected action when applicable.
- **FR-009**: System MUST persist each completed decision with its scenario context, selected action, strategy evaluation, explanation, and completion time so the result can be reviewed later.
- **FR-010**: System MUST make decision submission idempotent so a retry cannot create a second result for the same scenario and player.
- **FR-011**: System MUST allow the player to continue from a completed result into a new scenario without losing the completed result.
- **FR-012**: System MUST provide an authenticated player's progress summary based only on that player's completed decisions.
- **FR-013**: System MUST show an explicit unavailable evaluation when there is not enough strategy data, MAY record the legal decision with an `unavailable` result, MUST exclude it from strategic category counts, and MUST NOT fabricate strategic advice.
- **FR-014**: System MUST keep preflop scenario generation, strategy representation, decision evaluation, and educational explanations as separable domain responsibilities so later flop, turn, and river training can be added without changing the meaning of existing records.
- **FR-015**: System MUST ensure that a player cannot read, modify, or delete another player's training scenarios, decisions, explanations, or progress.
- **FR-016**: System MUST keep poker rule validation and scenario state authoritative on the server; the client may display choices but cannot determine legality, evaluation, or progress values.
- **FR-017**: This feature MUST be limited to preflop decisions in virtual-chip Texas Hold'em practice; postflop training, real-money play, tournaments, multiplayer table control, and arbitrary strategy advice are out of scope.

### Key Entities *(include if feature involves data)*

- **TrainingSession**: An authenticated player's active or completed practice context, including format, current scenario, and session timestamps.
- **TrainingScenario**: A reproducible preflop decision situation containing its generation seed, hole cards, position, table configuration, effective stack, blind context, prior actions, legal actions, and the strategy reference used for evaluation.
- **TrainingDecision**: The player's selected action and the resulting evaluation, including an `unavailable` status when strategy data is insufficient, linked to exactly one player and scenario with an idempotent identity.
- **StrategyRecommendation**: A versioned set of preferred actions, frequencies, assumptions, and explanatory factors for a scenario class; it never represents an ungrounded recommendation.
- **ProgressSummary**: An authenticated player's aggregate view of completed decisions grouped by evaluation category and action.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 99% of generated training scenarios pass validation for card uniqueness, legal position, non-negative stack, coherent action history, and an available decision point before being shown to a player.
- **SC-002**: A player can start a session and reach a decision-ready scenario in under 5 seconds in at least 95% of normal attempts.
- **SC-003**: 100% of submitted decisions are evaluated against the scenario shown to the authenticated player, with no cross-player scenario or progress exposure in security tests.
- **SC-004**: 100% of repeated submissions for the same scenario return one stable evaluation and create no duplicate completed decision.
- **SC-005**: At least 90% of usability-test participants can identify the legal action, submit a decision, and understand whether it was preferred, acceptable, marginal, or a significant deviation without external instructions.
- **SC-006**: A player can complete 20 valid preflop practice decisions in under 15 minutes while retaining access to every completed result.

## Assumptions

- The first Trainer release uses authenticated accounts and virtual chips from the existing platform; no real-money balance is involved.
- The initial training format uses Texas Hold'em No-Limit preflop situations with a fixed six-player table, standard blind structure, and a 100 BB default stack, while allowing the scenario context to represent position and effective stack explicitly.
- Strategy data is supplied from the documented, versioned dataset included in the first release; unsupported situations produce an unavailable state rather than invented advice.
- A player may have one resumable active training session at a time; starting again while it is active returns it unchanged, and completed decisions remain available in progress history.
- Postflop streets, tournaments, multiplayer human seats, coaching chat, and full solver integration are deferred to later features.
- Existing authentication, user identity, Poker Engine rules, and frontend shell are reused as dependencies.
