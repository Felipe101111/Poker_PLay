# Feature Specification: Friends System

**Feature Branch**: `002-friends-system`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Sistema de amigos (Etapa 4 del roadmap del producto): los usuarios podrán buscar otros usuarios, enviar solicitudes de amistad, aceptar/rechazar solicitudes, ver su lista de amigos, y eliminar amigos. Los estados posibles de una solicitud son PENDING, ACCEPTED, REJECTED. Debe evitarse duplicados y solicitudes inconsistentes (autosolicitud, solicitudes conflictivas). Depende de la feature 001 (User Authentication) ya implementada. 'Invitar amigos a una sala privada' se menciona en la visión del producto pero las salas (rooms) todavía no existen — queda fuera de alcance de esta feature."

## Clarifications

### Session 2026-09-25

- Q: ¿Al cancelar una solicitud pendiente o eliminar una amistad, el registro se borra por completo o se conserva marcado con un nuevo estado? → A: Borrado físico (sin historial) — cancelar/eliminar borra la fila; volver a conectar crea un registro nuevo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send a friend request (Priority: P1)

An authenticated user searches for another platform member by username and sends them a friend request, so they can eventually play and connect with people they know.

**Why this priority**: Without the ability to find someone and request a connection, no other part of the friends system has any value. This is the entry point of the whole feature.

**Independent Test**: Can be fully tested by searching for an existing username and sending a request, then verifying a pending request record exists between the two accounts and duplicate/self requests are rejected.

**Acceptance Scenarios**:

1. **Given** two distinct registered users with no existing request between them, **When** user A searches for user B's username and sends a friend request, **Then** a request is created in `PENDING` status, visible to both as sent (A) and received (B).
2. **Given** a request from A to B already exists in `PENDING` status, **When** A tries to send another request to B, **Then** the system rejects the duplicate request with a clear error.
3. **Given** an authenticated user, **When** they try to send a friend request to themselves, **Then** the system rejects it as an invalid self-request.
4. **Given** A and B are already friends (an earlier request was `ACCEPTED`), **When** A tries to send B a new friend request, **Then** the system rejects it — they are already friends.

---

### User Story 2 - Respond to a friend request (Priority: P1)

An authenticated user reviews a friend request they received and accepts or rejects it, so they control who they connect with.

**Why this priority**: Sending a request has no value unless the receiver can act on it — this closes the loop started by User Story 1 and is equally critical to reach a usable feature.

**Independent Test**: Can be fully tested by creating a pending request from A to B, then having B accept or reject it, and verifying the resulting status and that A and B only become friends after acceptance.

**Acceptance Scenarios**:

1. **Given** a `PENDING` request from A to B, **When** B accepts it, **Then** the request becomes `ACCEPTED` and both A and B see each other in their friends list.
2. **Given** a `PENDING` request from A to B, **When** B rejects it, **Then** the request becomes `REJECTED` and A and B are not friends.
3. **Given** a `PENDING` request from A to B, **When** A (the sender, not the receiver) tries to accept or reject it, **Then** the system rejects the action as unauthorized.
4. **Given** a request from A to B was previously `REJECTED`, **When** A sends a new friend request to B, **Then** the system allows it (rejection is not permanent) and a new `PENDING` request is created.

---

### User Story 3 - View my friends list (Priority: P2)

An authenticated user views their list of friends, including whether each friend currently appears to be online, so they know who they can invite or play with.

**Why this priority**: Valuable once connections exist, but the feature already delivers value (User Stories 1-2) before this is needed.

**Independent Test**: Can be fully tested by accepting a request between two users and confirming both see each other in their respective friends lists, with an online/offline indicator.

**Acceptance Scenarios**:

1. **Given** A and B are friends, **When** A views their friends list, **Then** B appears with their username and an online/offline indicator.
2. **Given** A and B are friends and B has an active (non-expired) session, **When** A views their friends list, **Then** B is shown as online.
3. **Given** A has no accepted friend requests, **When** A views their friends list, **Then** they see an empty list, not an error.

---

### User Story 4 - Remove a friend or cancel a pending request (Priority: P3)

An authenticated user removes an existing friend, or cancels a friend request they previously sent, so they can undo a connection they no longer want.

**Why this priority**: Important for keeping the friends list accurate and giving users control, but the feature is already usable end-to-end without it.

**Independent Test**: Can be fully tested by (a) accepting a request then having either side remove the friendship, and (b) sending a request then having the sender cancel it before it's answered — verifying both parties no longer see the connection afterward.

**Acceptance Scenarios**:

1. **Given** A and B are friends, **When** A removes B, **Then** the friendship ends and neither A nor B sees the other in their friends list anymore.
2. **Given** A sent a `PENDING` request to B that has not been answered, **When** A cancels it, **Then** the request no longer appears as pending for either A or B.
3. **Given** A and B are friends, **When** A removes B, **Then** A and B are free to send each other a new friend request afterward (removal permanently deletes the old record rather than blocking reconnection).

---

### Edge Cases

- What happens when a user searches for a username that doesn't exist, or that belongs to their own account? (No results / no self-match, not an error.)
- What happens when two users send each other a friend request at nearly the same time (A→B and B→A both pending simultaneously)? The system must resolve this into a single friendship rather than two conflicting pending requests.
- What happens when a user tries to remove someone who is not currently their friend, or cancel a request that no longer exists (already answered/removed by the other side)? (Idempotent-style clear error, not a crash.)
- What happens when a searched-for account no longer exists (e.g., race with account deletion) by the time a request is sent?
- How does the system handle a very large friends list for the purposes of the online/offline view (no specific scale target beyond the general platform scale from feature 001)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow an authenticated user to search for other registered users by username.
- **FR-002**: Search results MUST NOT expose other users' email addresses or password data — only username and public profile fields (Constitution Principle 4).
- **FR-003**: System MUST allow an authenticated user to send a friend request to another user by their user ID, creating a request in `PENDING` status.
- **FR-004**: System MUST reject a friend request where the sender and receiver are the same user (no self-requests).
- **FR-005**: System MUST reject a new friend request between two users if a `PENDING` request already exists between them in either direction, or if they are already friends (an `ACCEPTED` request already exists between them) — no duplicate or conflicting requests (Constitution Principle 22).
- **FR-006**: When two users send each other a request at effectively the same time (A→B and B→A both pending), the system MUST resolve this deterministically into a single friendship (e.g., treat the second incoming request as an implicit acceptance of the first) rather than leaving two conflicting pending requests.
- **FR-007**: System MUST allow only the receiver of a `PENDING` request to accept or reject it; the sender or any other user attempting this MUST be rejected as unauthorized (Constitution Principle 23).
- **FR-008**: Accepting a request MUST transition it to `ACCEPTED` and make the two users visible to each other as friends; rejecting MUST transition it to `REJECTED` and MUST NOT create a friendship.
- **FR-009**: A previously `REJECTED` request, or a cancelled/removed connection, MUST NOT permanently block either user from sending a new friend request to the other later — sending a new request after cancellation/removal creates a fresh record (Constitution Principle 24: no inconsistent leftover records).
- **FR-010**: System MUST allow only the original sender of a still-`PENDING` request to cancel it before it is answered; cancelling MUST permanently delete the request record (no retained history) rather than transition it to a status.
- **FR-011**: System MUST allow either member of an `ACCEPTED` friendship to remove it unilaterally by permanently deleting the record (no retained history); once removed, neither user MUST see the other in their friends list, and either may send a new friend request afterward, which creates a new record.
- **FR-012**: System MUST allow an authenticated user to view their own list of accepted friends, showing at least each friend's username and an online/offline indicator.
- **FR-013**: A friend MUST be shown as online when they have at least one currently active (non-expired) session (per feature 001's session model), and offline otherwise. This is a point-in-time indicator, not a real-time push update, in this feature.
- **FR-014**: System MUST treat all friend-request and friendship actions (search, send, accept, reject, cancel, remove, list) as authenticated-only operations, rejecting unauthenticated requests (Constitution Principle 3/23, reusing feature 001's session guard).
- **FR-015**: System MUST NOT implement inviting a friend to a private room in this feature (rooms do not exist yet), but the friendship data model MUST NOT preclude adding that capability later.

### Key Entities *(include if feature involves data)*

- **FriendRequest**: Represents a directional connection attempt between two existing `User` records (from feature 001). Attributes: unique ID, `senderId`, `receiverId`, `status` (`PENDING` | `ACCEPTED` | `REJECTED`), `createdAt`, and the timestamp of the last status change. An `ACCEPTED` `FriendRequest` **is** the friendship record between the two users — no separate friendship table is needed. A user's friends list is the set of users connected to them through an `ACCEPTED` request in either direction. Cancelling a `PENDING` request or removing an `ACCEPTED` friendship permanently deletes its row (no `CANCELLED`/`REMOVED` status, no retained history) — a later reconnection is a brand-new record.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can find another specific user and send them a friend request in under 30 seconds.
- **SC-002**: 100% of duplicate, self-directed, or already-friends friend request attempts are rejected without creating inconsistent records.
- **SC-003**: 100% of accept/reject actions performed by someone other than the request's receiver are rejected.
- **SC-004**: A user's friends list always reflects the current accepted-friendship state — no removed friend or un-accepted request ever appears as a friend.
- **SC-005**: 95% of users who send a friend request understand, without external help, whether it is still pending, was accepted, or was rejected (based on what the UI/API communicates).

## Assumptions

- Search matches on username only (not email), since email is treated as private login-only information per feature 001 and Constitution Principle 4.
- "Online" status in this feature is derived from the existence of an active (non-expired) session from feature 001, refreshed whenever the friends list is viewed/reloaded — true real-time (push-based) presence updates are deferred to the future real-time multiplayer feature (Article VII / roadmap Etapa 8).
- Removing a friend is unilateral (like most social platforms): neither party's consent is required, and it does not prevent either side from sending a new request afterward.
- Blocking/preventing a specific user from ever sending requests again is out of scope for this feature — not mentioned in the product vision; may be considered in a future safety/moderation feature.
- Rate limiting on search or friend-request creation (anti-spam) is out of scope for this first iteration, consistent with feature 001's documented decision to defer this kind of protection (see feature 001's temporary Constitution exception); it is not re-documented here as its own exception since no request-flooding protection was ever claimed for this feature.
- Inviting a friend to a private room is explicitly out of scope until the Rooms feature exists (roadmap Etapa 7); this feature only ensures the data model (stable `User` IDs and an accepted-friendship relation) will support it later without rework.
