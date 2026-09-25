# API Contract: Friends System

Base path: `/api/friends`. All request/response bodies are JSON. Every endpoint below requires the feature 001 session cookie (`requireAuth` middleware) — an unauthenticated request always returns `401 UNAUTHENTICATED` in the shared `{ "error": { "code", "message" } }` shape from feature 001's contract.

Search and friend responses never include `email` or `passwordHash` (Constitution Principle 4) — only `id`, `username`, and (for friends) an `online` boolean.

---

## GET /api/friends/search?query=

Search other users by username (FR-001, FR-002). Excludes the requester's own account from results.

**Responses**:

| Status | Condition | Body |
|---|---|---|
| 200 | Success (possibly empty) | `[{ "id": "uuid", "username": "PlayerOne" }, ...]` |
| 400 | Missing/empty `query` | `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }` |

---

## POST /api/friends/requests

Send a friend request (FR-003–FR-006).

**Request**: `{ "receiverId": "uuid" }`

**Responses**:

| Status | Condition | Body |
|---|---|---|
| 201 | New `PENDING` request created | `{ "id": "uuid", "receiverId": "uuid", "status": "PENDING", "createdAt": "ISO-8601" }` |
| 200 | The receiver had already sent *you* a pending request — this call auto-accepts it (FR-006) | `{ "id": "uuid", "receiverId": "uuid", "status": "ACCEPTED", "createdAt": "ISO-8601" }` |
| 400 | `receiverId` missing/invalid, or equals the caller's own id (FR-004) | `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }` |
| 404 | `receiverId` does not correspond to an existing user | `{ "error": { "code": "USER_NOT_FOUND", "message": "..." } }` |
| 409 | A `PENDING` (same direction) or `ACCEPTED` connection already exists (FR-005) | `{ "error": { "code": "FRIEND_REQUEST_CONFLICT", "message": "..." } }` |

---

## GET /api/friends/requests

List the caller's pending requests, split by direction (needed for SC-005 — a user must be able to tell what's pending).

**Response** (200):

```json
{
  "incoming": [{ "id": "uuid", "senderId": "uuid", "senderUsername": "PlayerTwo", "createdAt": "ISO-8601" }],
  "outgoing": [{ "id": "uuid", "receiverId": "uuid", "receiverUsername": "PlayerThree", "createdAt": "ISO-8601" }]
}
```

---

## POST /api/friends/requests/:id/accept

Accept an incoming `PENDING` request (FR-007, FR-008). Only the receiver may call this.

| Status | Condition | Body |
|---|---|---|
| 200 | Accepted | `{ "id": "uuid", "status": "ACCEPTED" }` |
| 401/403 | Caller is not the request's receiver | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` |
| 404 | No such `PENDING` request (wrong id, already resolved, or belongs to someone else) | `{ "error": { "code": "REQUEST_NOT_FOUND", "message": "..." } }` |

---

## POST /api/friends/requests/:id/reject

Reject an incoming `PENDING` request (FR-007, FR-008, FR-009). Only the receiver may call this. Deletes the underlying row (see data-model.md).

| Status | Condition | Body |
|---|---|---|
| 200 | Rejected | `{ "id": "uuid", "status": "REJECTED" }` |
| 401/403 | Caller is not the request's receiver | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` |
| 404 | No such `PENDING` request | `{ "error": { "code": "REQUEST_NOT_FOUND", "message": "..." } }` |

---

## DELETE /api/friends/requests/:id

Cancel a still-`PENDING` request the caller sent (FR-010). Only the original sender may call this.

| Status | Condition | Body |
|---|---|---|
| 204 | Cancelled | *(empty)* |
| 401/403 | Caller is not the request's sender | `{ "error": { "code": "UNAUTHORIZED", "message": "..." } }` |
| 404 | No such `PENDING` request | `{ "error": { "code": "REQUEST_NOT_FOUND", "message": "..." } }` |

---

## GET /api/friends

List the caller's accepted friends with an online indicator (FR-012, FR-013).

**Response** (200): `[{ "id": "uuid", "username": "PlayerOne", "online": true }, ...]`

---

## DELETE /api/friends/:userId

Remove an existing friendship with the given user (FR-011). Either member may call this.

| Status | Condition | Body |
|---|---|---|
| 204 | Removed (or was already not a friend — idempotent) | *(empty)* |
| 401 | Unauthenticated | `{ "error": { "code": "UNAUTHENTICATED", "message": "..." } }` |
