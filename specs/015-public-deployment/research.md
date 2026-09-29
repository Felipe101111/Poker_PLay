# Research: Public Deployment

## Decision 1: Use a three-service Render topology

- **Decision**: Deploy the Vite frontend as a Render Static Site, the Express and Socket.IO backend as a Render Web Service, and PostgreSQL as Render Postgres.
- **Rationale**: The frontend is a static production bundle, while the backend requires a long-running HTTP process, sessions, and WebSocket-compatible real-time communication. A managed PostgreSQL instance preserves users, sessions, rooms, and feature data across restarts. Render documents public `onrender.com` URLs, managed TLS, environment variables, health checks, private networking between services, and WebSocket support for web services.
- **Alternatives considered**: Hosting the frontend and backend together would require serving the Vite bundle from Express and would increase deployment coupling. A single local or self-managed server would not provide a stable public URL or managed database operations.

## Decision 2: Use Render-generated HTTPS URLs for the first release

- **Decision**: Accept the provider-generated HTTPS URLs as the minimum public release target; custom DNS is deferred.
- **Rationale**: The requested outcome is internet access, not domain branding. Provider URLs avoid DNS setup and still support secure cookies, CORS configuration, and remote smoke testing.
- **Alternatives considered**: A custom domain adds DNS, certificate, and ownership work without improving the minimum acceptance flow.

## Decision 3: Keep frontend and backend origins explicit

- **Decision**: Build the frontend with an explicit public backend base URL and configure the backend with the exact public frontend origin for credentialed CORS. Configure Socket.IO with the same backend origin and credentials.
- **Rationale**: The current application uses `VITE_API_BASE_URL`, `FRONTEND_ORIGIN`, and cookie credentials. Production must replace localhost defaults rather than infer origins or allow all origins.
- **Alternatives considered**: Relative API paths would require a reverse proxy or same-origin server arrangement and would be a larger architectural change. Wildcard CORS is incompatible with credentialed sessions and weakens the security boundary.

## Decision 4: Add a safe health endpoint and controlled migration step

- **Decision**: Add an unauthenticated health endpoint that returns a minimal readiness result without secrets or private data, and run Prisma schema deployment as a controlled release step before serving the dependent application version.
- **Rationale**: Render health checks need a stable endpoint, and a public service needs an operator-visible signal that distinguishes application startup from database readiness. Migrations must be repeatable and must not be hidden inside normal user requests.
- **Alternatives considered**: Checking only the frontend would miss backend and database failures. Running migrations opportunistically in request handlers would create race conditions and obscure deployment failures.

## Decision 5: Preserve existing authority and privacy boundaries

- **Decision**: Treat deployment as an operational change. Do not move poker calculations, session authority, private-card projection, or training evaluation to the browser or provider configuration.
- **Rationale**: The constitution requires server-authoritative game state, explicit authorization, private information protection, and independent domain modules. Public hosting increases exposure but does not change those responsibilities.
- **Alternatives considered**: Adding client-side fallbacks for table state or private data would violate server authority and privacy principles.

## Render-specific findings

- Render Web Services require binding the public HTTP listener to `0.0.0.0` and the `PORT` environment variable; the default platform port is 10000.
- Render Static Sites produce a public `onrender.com` URL, support HTTPS, and deploy the generated static bundle.
- Services in the same Render region can use private networking; the public frontend still uses the backend's public HTTPS origin unless a same-origin proxy is introduced.
- Render documents WebSocket connections for web services, which is required by Socket.IO.
- The exact plan limits, sleep behavior, bandwidth, WebSocket limits, and database backup behavior must be verified in the selected Render account before production acceptance.
