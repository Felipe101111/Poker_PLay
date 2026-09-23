# API Contract: Authentication & Profile

Base path: `/api`. All request/response bodies are JSON. All endpoints are server-authoritative (Constitution Principle 1/3) — no client-supplied field is trusted without server-side validation.

**Error shape** (all non-2xx responses):

```json
{ "error": { "code": "STRING_CODE", "message": "Human-readable message" } }
```

Error messages for authentication failures are intentionally generic (FR-007, SC-004) — they never reveal whether an email/username exists.

---

## POST /api/auth/register

Creates a new account (FR-001–FR-005, FR-012, FR-015).

**Request**:

```json
{ "email": "player@example.com", "username": "PlayerOne", "password": "at-least-8-chars" }
```

**Responses**:

| Status | Condition | Body |
|---|---|---|
| 201 | Account created | `{ "id": "uuid", "email": "player@example.com", "username": "PlayerOne", "createdAt": "ISO-8601" }` |
| 400 | Malformed email, or password shorter than 8 characters | `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }` |
| 409 | Email or (normalized) username already in use | `{ "error": { "code": "ACCOUNT_EXISTS", "message": "..." } }` |

No password or password hash is ever included in the response (Constitution Principle 4/5).

---

## POST /api/auth/login

Authenticates with email + password and starts a session (FR-006–FR-008, FR-015, FR-017).

**Request**:

```json
{ "email": "player@example.com", "password": "at-least-8-chars" }
```

**Responses**:

| Status | Condition | Body |
|---|---|---|
| 200 | Credentials valid | `{ "id": "uuid", "email": "player@example.com", "username": "PlayerOne" }` + `Set-Cookie: sid=<opaque>; HttpOnly; Secure; SameSite=Lax` (expires in 7 days, sliding) |
| 401 | Unknown email OR wrong password (indistinguishable, FR-007/SC-004) | `{ "error": { "code": "INVALID_CREDENTIALS", "message": "..." } }` |

---

## POST /api/auth/logout

Terminates the current session (FR-009).

**Request**: none (session cookie identifies the session).

**Responses**:

| Status | Condition | Body |
|---|---|---|
| 204 | Session terminated (or was already invalid/absent — idempotent) | *(empty)* + cookie cleared |

---

## GET /api/users/me

Returns the authenticated user's own profile (FR-010).

**Auth**: Requires a valid session cookie; otherwise 401.

**Responses**:

| Status | Condition | Body |
|---|---|---|
| 200 | Authenticated | `{ "id": "uuid", "email": "player@example.com", "username": "PlayerOne", "createdAt": "ISO-8601" }` |
| 401 | No valid session | `{ "error": { "code": "UNAUTHENTICATED", "message": "..." } }` |

---

## PATCH /api/users/me

Edits the authenticated user's editable profile field(s) (FR-011). Only `username` is editable in this feature; `id`, `email`, and `createdAt` are rejected if present in the body.

**Request**:

```json
{ "username": "NewDisplayName" }
```

**Responses**:

| Status | Condition | Body |
|---|---|---|
| 200 | Updated | `{ "id": "uuid", "email": "player@example.com", "username": "NewDisplayName", "createdAt": "ISO-8601" }` |
| 400 | Empty/invalid username | `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }` |
| 401 | No valid session | `{ "error": { "code": "UNAUTHENTICATED", "message": "..." } }` |
| 409 | Normalized username already taken by another account | `{ "error": { "code": "USERNAME_TAKEN", "message": "..." } }` |

Attempts to set `id`, `email`, or `createdAt` in the request body are silently ignored (not applied), per FR-011.
