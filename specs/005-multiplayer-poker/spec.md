# Feature Specification: Multiplayer Poker Tables

**Feature Branch**: `005-multiplayer-poker`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "005" (interpreted from the roadmap as real-time multiplayer poker using the existing rooms and Poker Engine)

## Clarifications

### Session 2026-09-26

- Q: When a player reaches zero chips after a completed hand, should they be removed from future hands until the started table ends? → A: Remove the player from future hands; preserve the completed-hand result and continue only if enough eligible players remain.
- Q: When a player remains disconnected beyond the 60-second grace period while it is their turn, should the system automatically fold their hand? → A: Automatically fold the disconnected player's hand and continue the current hand.
- Q: When fewer than two eligible players remain after a hand, should the started table close and prevent further hands? → A: Close the table, preserve completed results, and prevent further hands.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Join a live table and see its state (Priority: P1)

An authenticated member of a started poker room enters the table and sees the current hand state, their seat, the community cards, pot information, whose turn it is, and only the private information they are allowed to see.

**Why this priority**: A shared table is the foundation of multiplayer play. Every later action depends on all participants receiving the same authoritative state.

**Independent Test**: Start a room with at least two members, enter the table from separate authenticated accounts, and verify that both accounts see the same public state while each account sees only its own private cards.

**Acceptance Scenarios**:

1. **Given** a room has reached its started state with its final roster, **When** each member enters the table, **Then** each member sees the same hand stage, board, pot, seat assignments, and current turn.
2. **Given** a member views the table, **When** the table state contains private cards, **Then** that member sees their own cards and other players' cards remain hidden until a legitimate showdown.
3. **Given** a user is not a member of the started room, **When** they attempt to enter the table, **Then** access is rejected without revealing private table state.
4. **Given** no hand is currently active, **When** the started table is ready to play, **Then** the table begins one hand using the fixed room roster and configuration without changing the roster.

### User Story 2 - Act in turn at a shared table (Priority: P1)

A player submits a poker action for their own seat, and all table members see the accepted state change while the server enforces turn order, legal actions, stack limits, and betting rules.

**Why this priority**: Correct synchronized actions are the core value of multiplayer poker and the main protection against inconsistent or unfair table state.

**Independent Test**: Have two authenticated members take a complete sequence of legal and illegal actions from separate clients, verifying that legal actions advance the same table state for everyone and invalid or out-of-turn actions do not change it.

**Acceptance Scenarios**:

1. **Given** it is a player's turn and the player submits a legal action, **When** the action is accepted, **Then** the player's stack, contribution, pot, legal actions, and next turn update consistently for every member.
2. **Given** it is another player's turn, **When** a player submits an action, **Then** the action is rejected and no participant sees a changed game state.
3. **Given** two requests attempt to act on the same turn at nearly the same time, **When** the server processes them, **Then** exactly one valid action is applied and the other receives a current-state conflict without corrupting the hand.
4. **Given** a player submits an amount that is illegal for the current state, **When** the request is processed, **Then** it is rejected with a clear reason and the table remains unchanged.
5. **Given** all required actions for a betting round are complete, **When** the round advances, **Then** every member sees the same next street, board cards, pot, and player turn.

### User Story 3 - Stay connected and recover a table session (Priority: P2)

A player can temporarily lose connectivity and return to the same table without losing their seat, while the remaining members receive an understandable presence state and the game follows a defined timeout policy.

**Why this priority**: Real users experience refreshes, network interruptions, and browser suspension. Without recovery rules, a brief interruption can make an otherwise fair hand unplayable.

**Independent Test**: Connect multiple members, interrupt one member's connection during a waiting-for-action state, reconnect within the grace period, and verify state recovery, presence status, and action ownership. Repeat after the grace period expires.

**Acceptance Scenarios**:

1. **Given** a member temporarily disconnects during a hand, **When** they reconnect within 60 seconds, **Then** they recover the current authoritative state and retain their seat.
2. **Given** a member is disconnected while it is their turn, **When** the 60-second grace period expires, **Then** the system folds that member's hand and other members see the resulting state transition.
3. **Given** a member refreshes or reconnects, **When** the table state is restored, **Then** no duplicate seat, action, card, or pot is created.
4. **Given** a member leaves the table permanently after a hand has started, **When** the table applies the departure policy, **Then** the remaining members can continue without exposing the departing member's private information.

### User Story 4 - Complete a hand and continue the table (Priority: P2)

Players see a fair showdown and final result, then the table becomes ready for the next hand while preserving the room's fixed membership rules.

**Why this priority**: A multiplayer table must complete the full gameplay loop and return to a playable state rather than ending at the first result.

**Independent Test**: Play a hand through fold or showdown with multiple clients, verify private-card reveal and pot distribution, then verify the result is visible to all members and a subsequent hand begins with the documented dealer/blind rotation.

**Acceptance Scenarios**:

1. **Given** the hand ends by folds or showdown, **When** the result is resolved, **Then** every member sees the final board, legitimately revealed cards, winning hand information, pot awards, and updated stacks.
2. **Given** a hand ends in a tie or contains side pots, **When** the result is resolved, **Then** each pot is awarded only to eligible players according to the Poker Engine rules.
3. **Given** the result has been displayed and at least two eligible players remain, **When** the table is ready for another hand, **Then** the next hand uses the existing eligible members, rotates the dealer and blinds according to the documented rule, and does not admit new players into the started roster.
4. **Given** a player has no chips after a completed hand, **When** the next hand is prepared, **Then** that player is removed from future hands, their completed-hand result remains visible, and the table continues only if at least two eligible players remain; otherwise it closes.

### Edge Cases

- A player submits an action after the hand has advanced; the action is rejected as stale and includes the current state version.
- Two clients reconnect with the same account; only one active player seat remains authoritative, and the other client receives the current state without creating a duplicate participant.
- A player disconnects during a showdown or result transition; reconnecting shows the completed result rather than replaying cards or awards.
- A room is started with the minimum number of members and one member disconnects before the first action; the table applies the same inactivity policy as any later hand.
- A client receives delayed or duplicated state updates; it must converge to the newest authoritative state without regressing the board, pot, stacks, or turn.
- A player attempts to inspect another player's private cards through a crafted request; the response is rejected or redacted, including after reconnect and after a hand ends when cards were not legitimately revealed.
- A malformed action, impossible amount, unknown hand, or mismatched table identifier must not alter any persisted or active game state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require authentication and membership in the started room before granting access to a multiplayer table.
- **FR-002**: System MUST use the started room's final roster and configuration as the authoritative participants and rules for each hand.
- **FR-003**: System MUST provide each table member with a consistent view of public table state, including seats, stacks, contributions, board, pots, betting stage, hand status, and current turn.
- **FR-004**: System MUST reveal a player's private cards only to that player until a legitimate showdown or explicitly permitted reveal.
- **FR-005**: System MUST validate every submitted action against the current server-side hand state, acting player, legal action set, amount limits, and table membership.
- **FR-006**: System MUST reject stale, duplicated, malformed, out-of-turn, and unauthorized actions without changing the hand state.
- **FR-007**: System MUST ensure concurrent action requests for one turn result in at most one applied action and a deterministic response for every competing request.
- **FR-008**: System MUST distribute each accepted state change to all currently connected members so their public views converge to the same hand state.
- **FR-009**: System MUST provide a fresh authoritative table state when a member reconnects or refreshes, without duplicating seats, actions, cards, pots, or awards.
- **FR-010**: System MUST retain a reconnecting member's seat for a 60-second grace period during an active hand unless the member explicitly leaves or the hand reaches a terminal state.
- **FR-011**: System MUST automatically fold the acting member's hand when that member remains disconnected beyond the 60-second grace period.
- **FR-012**: System MUST represent member presence and connection status to authorized table members without exposing unnecessary session or account details.
- **FR-013**: System MUST use the existing Poker Engine as the authority for legal actions, street progression, showdown evaluation, side pots, and pot awards.
- **FR-014**: System MUST show every member the same final result for a completed hand, including board, legitimately revealed cards, pot awards, and updated stacks.
- **FR-015**: System MUST prepare subsequent hands using the documented dealer and blind rotation while preserving the started room's fixed roster, and MUST close the table when fewer than two eligible players remain.
- **FR-016**: System MUST remove a player who loses all chips from future hands, preserve their completed-hand result, and prevent them from receiving chips or re-entering the started roster without an allowed table transition.
- **FR-017**: System MUST protect private cards, action history, and table state from unauthorized users across initial access, live updates, reconnect, and completed-hand views.
- **FR-018**: System MUST provide clear stable errors for unauthenticated access, non-membership, stale actions, illegal actions, out-of-turn actions, disconnected-seat conflicts, and unavailable tables.
- **FR-019**: System MUST preserve the integrity of the hand if delivery to one or more clients fails; communication failure MUST NOT roll back or duplicate an accepted server-side action.
- **FR-020**: System MUST NOT implement tournaments, multi-table play, blind-level progression, cash balances, real-money wagering, or long-term hand-history analytics in this feature.

### Key Entities *(include if feature involves data)*

- **MultiplayerTable**: The live playable view of a started poker room, with its fixed roster, current hand, public state, connection presence, and lifecycle.
- **MultiplayerHand**: One server-authoritative hand associated with a started table, including street, turn, board, pots, contributions, action sequence, and terminal result.
- **TableParticipant**: A room member's active seat in the table, including connection state, last activity, stack, and hand eligibility.
- **TableAction**: A validated player request and its accepted or rejected result, including the acting participant, action type, amount, and state version.
- **PrivateCardView**: The authorized representation of a participant's hole cards, hidden from other members until a legitimate reveal.
- **HandResult**: The final public outcome of a hand, including revealed cards, evaluated hands, pot awards, updated stacks, and next-hand readiness.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of connected members in a started table converge on the same public hand state after every accepted action.
- **SC-002**: 100% of unauthorized private-card and table-state access attempts are rejected or redacted without exposing protected information.
- **SC-003**: At least 95% of valid actions are reflected for all connected members within 1 second under the feature's expected load.
- **SC-004**: 100% of concurrent requests for the same turn result in no more than one state transition, with no duplicate action, card, pot, or award.
- **SC-005**: At least 95% of members who reconnect within the 60-second grace period recover the current table state and their seat within 5 seconds.
- **SC-006**: 100% of completed hands produce a result whose board, revealed cards, hand ranking, side pots, and awards match the Poker Engine's authoritative outcome.
- **SC-007**: At least 90% of first-time users can identify their turn, legal actions, stack, pot, and connection status without external instructions.

## Assumptions

- The feature reuses authenticated users and the fixed roster of a room already transitioned to `STARTED` by feature 004.
- A started room contains one table and supports one active hand at a time; the room remains the boundary for membership and authorization.
- A hand begins automatically when the table has its fixed roster and is ready, without a separate lobby-management workflow.
- The dealer button rotates among eligible seats between hands; the first-hand button is chosen by a documented deterministic rule because the room has no prior hand.
- A disconnected acting player receives an automatic fold when the 60-second grace period expires.
- A player who reaches zero chips remains part of the completed hand but is eliminated from future hands; the table continues only while at least two eligible players remain and otherwise closes.
- Live updates are required for the shared table experience, but long-term hand history, spectator access, tournaments, multiple tables, and real-money balances are deferred.
- The existing room and Poker Engine contracts remain backward compatible while the multiplayer table capability is added.
