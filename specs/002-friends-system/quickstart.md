# Quickstart: Validating the Friends System

Validation guide for `002-friends-system`, building on feature 001's running backend/frontend (see [../001-user-authentication/quickstart.md](../001-user-authentication/quickstart.md) for base setup). Maps to [contracts/friends-api.md](./contracts/friends-api.md) and [data-model.md](./data-model.md).

## Prerequisites

- Feature 001's backend running with migrations applied, plus this feature's `friend_requests` table migrated.
- Two registered accounts to act as "A" and "B" (register both via `POST /api/auth/register` as in feature 001's quickstart).

## Setup

```powershell
cd backend
npm.cmd run prisma:migrate
npm.cmd run dev
```

## Validation Scenarios

### 1. Search and send a request (User Story 1)

```powershell
# Logged in as A (cookies-a.txt)
curl.exe -s -b cookies-a.txt "http://localhost:3000/api/friends/search?query=B"
curl.exe -s -b cookies-a.txt -X POST http://localhost:3000/api/friends/requests -H "Content-Type: application/json" -d '{"receiverId":"<B_USER_ID>"}'
```

**Expected**: search returns B; request returns `201` with `status: PENDING`. Repeating the same POST returns `409 FRIEND_REQUEST_CONFLICT`. Sending a request with `receiverId` equal to A's own id returns `400`.

### 2. Respond to the request (User Story 2)

```powershell
# Logged in as B (cookies-b.txt)
curl.exe -s -b cookies-b.txt http://localhost:3000/api/friends/requests
curl.exe -s -b cookies-b.txt -X POST http://localhost:3000/api/friends/requests/<REQUEST_ID>/accept
```

**Expected**: B's `incoming` list shows A's request; accepting returns `200 { status: "ACCEPTED" }`. Retry with A's cookie instead of B's on a fresh pending request → `401`/`403` (only the receiver may accept/reject).

### 3. Mutual request race (FR-006)

Have A send a request to B, and — without B answering it — have B independently send a request to A.

**Expected**: B's request call returns `200` with `status: "ACCEPTED"` (not a new `PENDING` row or a conflict error) — the reverse request is treated as acceptance.

### 4. View friends list with online indicator (User Story 3)

```powershell
curl.exe -s -b cookies-a.txt http://localhost:3000/api/friends
```

**Expected**: B appears with `"online": true` while B has an active session (logged in); log B out (`POST /api/auth/logout`) and repeat — `"online": false`.

### 5. Remove / cancel (User Story 4)

```powershell
curl.exe -s -b cookies-a.txt -X DELETE http://localhost:3000/api/friends/<B_USER_ID>
curl.exe -s -b cookies-a.txt http://localhost:3000/api/friends
```

**Expected**: `204`, then B no longer appears in A's friends list. A can immediately send B a new friend request afterward (no permanent block).

## Definition of Done for this quickstart

- [ ] All 5 scenarios above produce the expected status codes and bodies.
- [ ] Automated contract/integration tests cover the same scenarios, including the FR-006 race.
- [ ] No response from any endpoint ever includes `email` or `passwordHash`.
