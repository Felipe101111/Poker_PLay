# Feature 015 Quickstart: Public Render Deployment

## Purpose

Deploy the existing Poker Platform to Render and verify that the public HTTPS URL supports authentication, persistence, multiplayer communication, and privacy boundaries.

## Prerequisites

- A Render account with permission to create services and a PostgreSQL database.
- The repository connected to a Git provider branch containing the implementation.
- Node.js 20+ and npm for local validation.
- A production test account and two browser sessions for multiplayer verification.
- No production secrets committed to the repository.

## Local pre-deployment validation

From the repository root:

```powershell
Set-Location backend
npm.cmd ci
npm.cmd run prisma:generate
npm.cmd run build
npm.cmd test

Set-Location ..\frontend
npm.cmd ci
npm.cmd run build
npm.cmd test -- --run
```

Expected outcome: backend and frontend builds pass, and existing tests remain green.

After Render provides the two service URLs, run the basic public smoke check from the repository root:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\smoke-public-deployment.ps1 `
   -FrontendUrl "https://poker-play-frontend.onrender.com" `
   -BackendUrl "https://poker-play-backend.onrender.com"
```

Expected outcome: the frontend returns HTTP 200 and the backend health response reports `status: ok` with database status `ok`.

## Render service setup

Create these services in the same Render region:

1. **PostgreSQL**: create a managed database and copy its internal connection string for the backend service.
2. **Backend Web Service**:
   - Root directory: `backend`.
   - Build command: `npm ci && npm run prisma:generate && npm run build`.
   - Start command: `npm run prisma:migrate:deploy && npm start` or the equivalent controlled pre-deploy migration configured for the selected Render plan.
   - Health check path: `/health`.
   - Confirm the process binds to `0.0.0.0` and `PORT`.
3. **Frontend Static Site**:
   - Root directory: `frontend`.
   - Build command: `npm ci && npm run build`.
   - Publish directory: `dist`.
   - Configure `VITE_API_BASE_URL` to the backend HTTPS URL before the build.

## Required backend environment variables

Configure these in the Render backend service without committing their values:

- `DATABASE_URL`: Render PostgreSQL connection string.
- `SESSION_SECRET`: long random production secret.
- `NODE_ENV=production`.
- `FRONTEND_ORIGIN`: exact frontend HTTPS origin.
- `PORT`: normally supplied by Render; do not hard-code a local-only port.

Configure `VITE_API_BASE_URL` in the frontend service as a build-time environment variable containing the exact backend HTTPS origin.

## First deployment verification

1. Wait for the database and backend deploy to report healthy.
2. Open `https://<backend-host>/health` and verify a safe `200` readiness response.
3. Open the frontend `onrender.com` URL over HTTPS.
4. Register a test account, log in, navigate to a protected page, and log out.
5. Open two browser sessions, sign in with authorized users, create or join a room, and verify synchronized room state.
6. Run one server-confirmed table action or multiplayer-training update.
7. Refresh an authenticated page and verify session recovery.
8. Confirm private cards and private training feedback are visible only to the authorized user.
9. Force or observe a socket disconnect and verify the UI shows a disconnected/reconnecting state without inventing a result.
10. Review service logs and deployment settings for secrets, raw cookies, private cards, and private feedback; none may appear.

## Recovery verification

- Roll back to the last healthy release using the provider's deployment history.
- If a schema deployment fails, keep the dependent application release unavailable until the schema is corrected.
- Re-run `/health`, authentication, and one multiplayer smoke test after recovery.
- Record the public frontend URL, backend URL, database service name, deployment revision, and verification timestamp in the release notes without recording secrets.

## Expected outcomes

- The frontend URL works from a network outside the development computer.
- The backend health endpoint reports safe readiness information.
- Sessions and persistent test data survive a backend restart.
- Socket.IO supports the existing multiplayer flow.
- Existing server authority, authorization, private-card projection, training-feedback privacy, and virtual-chip behavior remain unchanged.
