# Quickstart: Validating User Authentication

This guide proves the feature works end-to-end against the contracts in [contracts/auth-api.md](./contracts/auth-api.md) and the entities in [data-model.md](./data-model.md). It is a validation guide, not an implementation guide — implementation steps live in `tasks.md`.

## Prerequisites

- Backend running locally (`backend/`) with a PostgreSQL 16 instance reachable and migrations applied (`User`, `Session` tables from data-model.md).
- Frontend running locally (`frontend/`) for the manual UI checks; API checks below can be run with `curl`/HTTPie directly against the backend.

## Setup

```powershell
# Backend
cd backend
npm install
npm run prisma:migrate
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Validation Scenarios

Each scenario maps to a User Story / acceptance scenario in spec.md.

### 1. Register a new account (User Story 1)

```powershell
curl -i -X POST http://localhost:3000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"trainer1@example.com","username":"Trainer1","password":"correcthorse"}'
```

**Expected**: `201`, body includes `id`, `email`, `username`, `createdAt`; no password/hash present.

Repeat the same request again. **Expected**: `409 ACCOUNT_EXISTS`.

### 2. Log in (User Story 2)

```powershell
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"trainer1@example.com","password":"correcthorse"}'
```

**Expected**: `200`, `Set-Cookie` header present (`HttpOnly`, `Secure`, `SameSite=Lax`). Retry with a wrong password: **Expected** `401 INVALID_CREDENTIALS` — identical error shape as an unknown email (verify by trying a non-existent email too; both must return the same body).

### 3. View and edit profile (User Story 3)

```powershell
curl -i -b cookies.txt http://localhost:3000/api/users/me

curl -i -b cookies.txt -X PATCH http://localhost:3000/api/users/me `
  -H "Content-Type: application/json" `
  -d '{"username":"Trainer1Renamed"}'
```

**Expected**: first call `200` with profile; second call `200` with updated `username`. Attempt `-d '{"id":"anything"}'` and confirm the `id` in the response is unchanged.

### 4. Log out (User Story 4)

```powershell
curl -i -b cookies.txt -X POST http://localhost:3000/api/auth/logout
curl -i -b cookies.txt http://localhost:3000/api/users/me
```

**Expected**: logout returns `204`; the subsequent `GET /api/users/me` with the same (now-invalid) cookie returns `401 UNAUTHENTICATED` (validates SC-006).

### 5. Session sliding expiration (FR-008)

Automated test only (not practical to wait 7 days manually): assert that each authenticated request updates the session's `expiresAt` to `now + 7 days` in the `Session` table/store.

## Definition of Done for this quickstart

- [ ] All 4 manual scenarios above produce the expected status codes and bodies.
- [ ] Automated contract tests (Vitest + Supertest) cover the same scenarios plus the sliding-expiration assertion.
- [ ] No scenario ever returns a password or password hash in any response body.
