# Data Model: Public Deployment

This feature adds deployment-facing entities and configuration. It does not add poker-domain entities or change Prisma domain records.

## Deployment Environment

Represents one configured production environment.

| Field | Description | Validation |
|---|---|---|
| `environmentName` | Human-readable environment identifier | Must identify the production target unambiguously |
| `frontendOrigin` | Exact HTTPS origin served to users | Must be an HTTPS origin and match credentialed CORS configuration |
| `backendOrigin` | Public HTTPS origin for API and Socket.IO | Must be reachable from the frontend origin |
| `databaseConnection` | Provider-managed database connection reference | Secret value never committed or emitted in logs |
| `sessionSecret` | Secret used to sign session cookies | Required in production; must not use the development fallback |
| `runtimeMode` | Production runtime selection | Must enable secure cookie behavior |
| `port` | Provider-assigned HTTP port | Backend binds to the provider port on `0.0.0.0` |

## Public Application URL

The stable HTTPS entry point that a user opens.

- Must resolve from outside the development network.
- Must redirect or reject insecure HTTP according to provider behavior.
- Must serve the frontend entry route and client-side route fallback.
- Must not expose secret configuration in the document or response.

## Backend Health Status

A minimal operational projection returned by the backend health endpoint.

- `status`: `ok` when the service is ready, otherwise an unavailable result.
- `service`: stable service identifier.
- `dependencies`: safe statuses for required persistence connectivity.
- `timestamp`: response time in ISO format if useful for operators.

Health output must never include database URLs, credentials, session values, stack traces, cards, user IDs, or game state.

## Release

Represents one deployed application version and its operational result.

- `sourceRevision`: repository revision or provider release identifier.
- `schemaState`: whether required database schema deployment completed.
- `serviceState`: frontend and backend deployment states.
- `healthState`: readiness result after deployment.
- `rollbackTarget`: last known healthy release when recovery is required.

## Relationships and lifecycle

```text
Deployment Environment
  -> serves one Public Application URL
  -> configures one Frontend Service and one Backend Service
  -> connects the Backend Service to one Production Database
  -> produces ordered Releases

Release
  -> schema deployment
  -> service build/start
  -> health verification
  -> active or rolled back
```

## Invariants

- Production secrets are managed outside versioned source files.
- Frontend and backend origins are explicit and mutually compatible.
- A release that requires an unavailable schema is not considered ready.
- Health status contains operational information only.
- Deployment restarts do not redefine poker state, user authorization, or private-information projections.
