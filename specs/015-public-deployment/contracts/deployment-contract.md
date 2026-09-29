# Deployment Contract: Public Render Environment

## Public frontend contract

The public frontend URL MUST:

- Serve the production Vite bundle over HTTPS.
- Load the login or registration entry experience.
- Preserve client-side route navigation for authenticated routes.
- Use the configured public backend origin for API requests.
- Use the configured public backend origin for Socket.IO connections.
- Show unavailable or disconnected states when the backend cannot be reached.

## Backend health contract

### `GET /health`

Unauthenticated operational endpoint used by the provider and operators.

### Ready response

```json
{
  "status": "ok",
  "service": "poker-play-backend",
  "dependencies": {
    "database": "ok"
  }
}
```

- Status: `200`.
- No session required.
- No credentials, user data, private cards, game state, or stack traces.

### Unavailable response

```json
{
  "status": "unavailable",
  "service": "poker-play-backend",
  "dependencies": {
    "database": "unavailable"
  }
}
```

- Status: `503` when a required dependency is unavailable.
- Response remains safe for public exposure.

## Required production configuration contract

| Configuration | Consumer | Rule |
|---|---|---|
| `DATABASE_URL` | Backend | Provider-managed PostgreSQL connection; secret |
| `SESSION_SECRET` | Backend | Long random production secret; secret |
| `NODE_ENV` | Backend | `production` |
| `PORT` | Backend | Provider-assigned port; service binds to it |
| `FRONTEND_ORIGIN` | Backend and Socket.IO | Exact public frontend origin, no wildcard |
| `VITE_API_BASE_URL` | Frontend build | Exact public backend origin |

Development fallback values must not be used by the production deployment.

## Render service contract

| Service | Type | Root directory | Build | Start / publish |
|---|---|---|---|---|
| Frontend | Static Site | `frontend` | `npm ci; npm run build` | Publish `dist` |
| Backend | Web Service | `backend` | `npm ci; npm run prisma:generate; npm run build` | `npm start` after controlled schema deployment |
| Database | PostgreSQL | Managed service | Provider-managed | `DATABASE_URL` supplied to backend |

The final Render configuration must define the health check path `/health`, the production branch, and the selected region consistently for services that use private networking.

## Verification contract

A release is accepted only when:

1. The frontend URL returns the entry screen over HTTPS.
2. `GET /health` returns the expected readiness result.
3. Registration, login, logout, and protected navigation work.
4. Two sessions can complete a room or multiplayer smoke flow.
5. Socket.IO reconnect/disconnected behavior is visible and does not fabricate state.
6. Private-card and training-feedback privacy checks pass.
7. No reviewed deployment file or routine log contains secrets.
