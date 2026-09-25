# Phase 0 Research: Friends System

This feature reuses feature 001's established stack (Node/TypeScript/Express/Prisma/PostgreSQL/React) — see [../001-user-authentication/research.md](../001-user-authentication/research.md) for those foundational decisions, not repeated here. Only the decisions specific to this feature are documented below. No open `NEEDS CLARIFICATION` markers remain.

## Decision: One row per unordered user pair, not one row per direction

- **Rationale**: FR-005/FR-006 require that A→B and B→A can never coexist as separate pending requests, and that A and B can never end up with two rows once they're friends. The simplest way to guarantee this at the database level — not just in application logic — is to store a normalized, order-independent pair key (e.g., the two user IDs sorted lexicographically into `userLowId`/`userHighId`) with a unique constraint on that pair, in addition to the directional `senderId`/`receiverId` needed for authorization (FR-007/FR-010). A unique-constraint violation on insert becomes the atomic signal that a row already exists for this pair, which the service layer uses to implement FR-006 (auto-accept the existing reverse-direction pending request instead of erroring).
- **Alternatives considered**:
  - *Directional-only unique constraint (`@@unique([senderId, receiverId])`)*: Does not prevent a reverse-direction row from being inserted concurrently — FR-006's race would not be caught by the database at all, only by (racy) application-level checks.
  - *Two rows kept in sync via application logic only*: Rejected — relies entirely on application-level locking/checking, which is exactly the kind of "inconsistent record" risk Constitution Principle 24 warns against.

## Decision: Physical delete for reject/cancel/remove; no `CANCELLED`/`REJECTED`/`REMOVED` enum values persisted

- **Rationale**: The spec's clarification session settled cancel/remove on physical deletion with no retained history. Extending the same treatment to "reject" (rather than persisting a `REJECTED` status indefinitely) keeps a single simple invariant: a `friend_requests` row exists if and only if there is currently a live `PENDING` request or an active friendship (`ACCEPTED`). The user-facing "rejected" outcome (FR-008) is communicated in the API response at the moment of the action, not by a lingering row a client could later query.
- **Alternatives considered**:
  - *Persist `REJECTED` (and `CANCELLED`) as terminal enum values, never deleted*: Would satisfy FR-008's literal wording just as well, but reintroduces exactly the kind of accumulating history the spec's clarification explicitly rejected for cancel/remove — and would require extra logic to make a post-rejection resend "create a fresh record" (FR-009) rather than colliding with the old row's unique constraint. Rejected for consistency and simplicity (Constitution Principle 29).

## Decision: "Online" is computed via a small helper exported from the `auth` module, not duplicated in `friends`

- **Rationale**: Feature 001's session data lives in `connect-pg-simple`'s own `session` table (a JSON blob keyed by session id), not in a Prisma model. Rather than have the `friends` module reach into that table's storage format directly (coupling two modules to an implementation detail owned by `auth`), `auth` exports one function, `isUserOnline(userId): Promise<boolean>`, that the `friends` module calls. This keeps the "how is a session stored" knowledge inside the module that owns it (Constitution Principle 6/36).
- **Alternatives considered**:
  - *Query the `session` table directly from the `friends` module*: Works but violates domain boundaries — a future change to how `auth` stores sessions (e.g., moving to Redis per feature 001's research.md "revisit if scale requires it" note) would silently break `friends` too.

## Decision: Friend search matches on `username` only, case-insensitive substring match

- **Rationale**: Spec FR-001/Assumptions restricts search to username (not email, for privacy). A case-insensitive substring match (`ILIKE '%query%'` via Prisma's `contains` + `mode: 'insensitive'`) gives reasonable discoverability without needing a dedicated search index at this scale (Constitution Principle 29).
- **Alternatives considered**:
  - *Exact username match only*: Simpler, but a poor user experience for a "search" feature (SC-001's 30-second target assumes the user doesn't already know the exact casing/spelling).
  - *Full-text search index*: Unnecessary complexity for the expected user-table size at this stage; revisit only if search performance becomes a measured problem.
