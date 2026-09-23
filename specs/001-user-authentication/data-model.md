# Phase 1 Data Model: User Authentication

## Entity: User

Represents a registered platform member and the anchor identity every later feature (friends, rooms, tournaments, poker/trainer history) will reference.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID (PK) | Generated server-side at creation; immutable; never reused. |
| `email` | string | Required. Normalized (lowercased, trimmed) before validation/storage. Unique (case/whitespace-insensitive). Must be a well-formed email address (FR-002). Used as the sole login identifier (FR-017). |
| `username` | string | Required. Normalized (lowercased, trimmed) for uniqueness comparison only; original casing preserved for display. Unique (case/whitespace-insensitive, FR-003). Also serves as the display name (FR-011) — editable after registration, re-validated against the same uniqueness/normalization rule on every edit. |
| `passwordHash` | string | Required. Argon2id hash only — the plaintext password MUST NOT be persisted, logged, or returned in any response (FR-005, Constitution P5). |
| `createdAt` | timestamp | Set once at creation; immutable; returned in profile view (FR-010). |

**Validation rules**:
- Email format validated server-side (FR-002) regardless of any client-side check (FR-013).
- Password (input only, never persisted as-is): minimum 8 characters, no forced composition rules (FR-004).
- Username: non-empty after trimming; exact allowed character set/length is an implementation detail for `/speckit-tasks` to define via the request validation schema (`zod`), not a product-level constraint from the spec.

**Relationships**: No relationships in this feature. Future features will add foreign keys from `Friendship`, `PokerRoom` membership, `TournamentPlayer`, `PokerHand`, and Trainer history records to `User.id`, but those tables are out of scope here (Constitution Principle 6 — clear domain boundaries).

**Lifecycle**: `User` has no state machine in this feature — it exists from successful registration onward. Account deactivation/deletion is not specified and is out of scope.

## Entity: Session

Represents one authenticated login instance for a `User`.

| Field | Type | Rules |
|---|---|---|
| `id` | opaque string (PK) | Cryptographically random session identifier; the value stored in the client's `HttpOnly` cookie. Never derived from or containing user data. |
| `userId` | UUID (FK → User.id) | Required. Identifies which user this session authenticates. |
| `createdAt` | timestamp | Set once when the session is created at login (FR-008). |
| `expiresAt` | timestamp | Initially `createdAt + 7 days` (FR-008). Recomputed to `now + 7 days` on every authenticated request against this session ("sliding" expiration). |

**Validation rules**:
- A request is authenticated only if its session `id` matches a stored, non-expired `Session` row (`expiresAt > now`).
- Logout (FR-009) deletes the `Session` row (or marks it invalid) so the same cookie can never be reused afterward — this MUST happen before the response is sent so SC-006 (100% rejection after logout) holds.

**State transitions**:

```text
[created at login] --(authenticated request before expiresAt)--> [slides expiresAt forward]
[created at login] --(explicit logout)--> [deleted / invalid]
[created at login] --(no activity until expiresAt)--> [expired: treated as if deleted]
```

**Relationships**: Many `Session` rows can reference one `User` (a user may be logged in from multiple devices at once — Edge Case: multi-device sessions are each independent; this feature does not limit concurrent sessions per user).
