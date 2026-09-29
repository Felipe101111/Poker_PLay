# Feature Specification: Public Deployment

**Feature Branch**: `015-public-deployment`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "015 usa render para el servico de url publica"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access the platform from the internet (Priority: P1)

As the owner of Poker Platform, I want the web application to be available through a stable public URL, so that I can access it from any device with an internet connection without running the project locally.

**Why this priority**: A public URL is the primary value requested by this feature and is required before the application can be shared or used remotely.

**Independent Test**: Open the assigned public URL from a network outside the development computer and verify that the application loads, displays the login experience, and can reach the backend health endpoint through the public deployment.

**Acceptance Scenarios**:

1. **Given** the deployment is healthy, **When** a user opens the public URL, **Then** the application loads over HTTPS and presents the expected entry screen.
2. **Given** a user opens the public URL from a second device or network, **When** the page is refreshed, **Then** the application remains reachable without requiring a local development process.
3. **Given** the deployment is unavailable or still starting, **When** a user opens the public URL, **Then** the user receives a clear unavailable-state message rather than a misleading authenticated or game state.

### User Story 2 - Use authenticated and multiplayer features remotely (Priority: P1)

As an authenticated player, I want login, sessions, rooms, poker tables, and multiplayer training to work through the public deployment, so that remote access does not remove the core product workflows.

**Why this priority**: The application is not useful as a public site if authentication, persistence, or real-time poker flows only work locally.

**Independent Test**: From the public URL, create or use a test account, authenticate, create or join a room, and verify one server-confirmed table or training update from a separate browser session.

**Acceptance Scenarios**:

1. **Given** a registered test account, **When** the user logs in through the public URL, **Then** the session persists across page navigation and protected routes remain accessible.
2. **Given** two authorized test users, **When** they join the same public room, **Then** room membership and readiness state are synchronized between their browser sessions.
3. **Given** a multiplayer table or training session is active, **When** a user submits a legal action, **Then** the displayed state changes only after the server acknowledges the action.
4. **Given** a user reloads an authenticated page, **When** the session is still valid, **Then** the user can recover the authorized view without exposing another user's private cards or training feedback.

### User Story 3 - Operate and recover the public service (Priority: P2)

As the owner of the platform, I want deployment configuration, health checks, migrations, logs, and recovery steps to be documented, so that I can identify failures and restore public access without guessing.

**Why this priority**: A public service needs repeatable operation and recovery, not only a one-time deployment.

**Independent Test**: Follow the deployment and recovery guide using a clean environment, verify the health check, inspect a failed-service signal, and restore the service without changing application behavior.

**Acceptance Scenarios**:

1. **Given** a new production environment, **When** the documented setup steps are followed, **Then** the application services start with the required configuration and the database schema is current.
2. **Given** an application service restarts, **When** it becomes healthy again, **Then** the public URL serves the application and existing persistent data remains available.
3. **Given** a deployment fails its health check, **When** the owner reviews the documented diagnostics, **Then** the failure reason and next recovery action are identifiable from service status and logs.

### Edge Cases

- The public URL is opened while the frontend service is deployed but the backend or database is unavailable; the interface must show a clear degraded state and must not claim actions succeeded.
- A deployment restart interrupts a Socket.IO connection; clients must reconnect or show a clear disconnected state without inventing table or training results.
- A production migration is pending or fails; the deployment must stop or report the failure before serving a partially compatible application.
- The configured public origin does not match the browser origin; credentialed requests must fail safely and expose a useful configuration error to the operator.
- A session cookie is used over an insecure connection; authentication must not silently downgrade production security settings.
- The service receives invalid or unauthorized requests from the public internet; existing validation, authorization, privacy, and rate or resource protections remain enforced.
- The provider restarts an instance or applies a deployment while users are connected; no private cards, credentials, or server-authoritative state may be exposed by the transition.
- Logs or deployment diagnostics contain secrets, session values, passwords, database URLs, or private poker data; sensitive values must be redacted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product MUST be reachable through one documented public HTTPS URL that can be opened from outside the development computer.
- **FR-002**: The public deployment MUST serve the existing web application without requiring the user to run local frontend or backend processes.
- **FR-003**: The deployment MUST connect the public web application to a persistent production database so registered users, rooms, sessions, and supported history remain available after service restarts.
- **FR-004**: The deployment MUST provide separate, documented configuration for public frontend origin, backend origin, database connection, session signing, runtime environment, and service ports without committing secret values to the repository.
- **FR-005**: The deployment MUST support secure authenticated sessions over HTTPS and MUST reject or safely handle requests from origins that are not explicitly allowed.
- **FR-006**: The deployment MUST support the existing real-time multiplayer communication required by rooms, tables, and multiplayer training, including reconnect and disconnected-state behavior.
- **FR-007**: The deployment MUST run required database schema updates in a controlled and repeatable way before an application version that depends on them serves production traffic.
- **FR-008**: The public service MUST expose a health signal that verifies application availability and reports dependency failure without exposing credentials or private data.
- **FR-009**: The deployment MUST retain existing authentication, authorization, server-authoritative poker actions, private-card projection, training-feedback privacy, and virtual-chip boundaries.
- **FR-010**: The deployment MUST provide access to operational logs and service status sufficient to diagnose startup, configuration, database, CORS, session, and real-time connection failures.
- **FR-011**: The deployment MUST document a rollback or recovery path for failed releases, unavailable dependencies, and accidental configuration changes.
- **FR-012**: The deployment MUST document the Render service arrangement, required environment variables, build and start commands, public URL assignment, database setup, migration procedure, and post-deployment verification steps.
- **FR-013**: The deployment MUST prevent secrets, session credentials, database credentials, raw request authorization values, and private poker information from appearing in committed configuration or routine logs.
- **FR-014**: The public deployment MUST provide clear user-visible loading, unavailable, disconnected, and failed-action states when a remote service cannot be reached or acknowledged.

### Key Entities

- **Public Application URL**: The stable HTTPS address through which users open the browser client.
- **Frontend Service**: The publicly served browser application and its build configuration.
- **Backend Service**: The authenticated application service that owns API, session, poker, and real-time behavior.
- **Production Database**: Persistent storage used by the public backend, including users, sessions, rooms, and supported feature data.
- **Deployment Environment**: The provider configuration containing service settings, origins, secrets, runtime values, and release commands.
- **Health Status**: A safe operational signal indicating whether the public application and required dependencies are ready to serve traffic.
- **Release**: A versioned application deployment with its configuration, schema compatibility, health result, and recovery status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user outside the development network can open the documented URL over HTTPS and reach the application entry screen in at least 99% of verification attempts during the acceptance window.
- **SC-002**: A new user can complete registration, login, navigation to a protected page, and logout through the public URL without starting any local process.
- **SC-003**: Two authorized browser sessions can complete one room join or readiness flow and observe the same server-confirmed state through the public deployment.
- **SC-004**: One representative multiplayer action and one multiplayer-training update complete through the public service without exposing unauthorized private information or bypassing server acknowledgement.
- **SC-005**: After a documented service restart, persistent test data remains available and the public URL returns to a healthy state within 10 minutes.
- **SC-006**: An operator can identify the cause of a simulated startup, database, origin, session, or real-time connection failure using documented service status and logs in under 15 minutes.
- **SC-007**: No committed deployment file or reviewed routine log contains a production secret, session credential, database credential, unauthorized private card, or private training feedback payload.
- **SC-008**: A failed release can be rolled back or disabled using the documented recovery path without modifying poker rules, authorization policy, or persisted user data.

## Assumptions

- Render is the selected deployment provider for the first public deployment.
- The deployment may use separate frontend and backend services plus a managed PostgreSQL database, as long as the user receives one documented public entry URL.
- The existing session-based authentication model is retained; no social login or account migration is introduced.
- The application remains a virtual-chip platform and does not process real-money wagers or payouts.
- A production domain supplied by the provider is sufficient for the first release; a custom domain is optional and outside the minimum acceptance target.
- The owner can create a Render account, configure environment variables, and provide any required billing or database access.
- The provider's free or paid plan limits, sleep behavior, bandwidth, storage, and WebSocket support must be verified before the acceptance review; the feature does not assume unlimited availability.
- A test account and at least two browser sessions are available for multiplayer verification.
- Existing backend and frontend behavior is the source of truth; deployment work must not change poker calculations, privacy projections, or server-authoritative decisions.

## Scope Boundaries

### In Scope

- Public Render deployment of the existing frontend and backend.
- Persistent production PostgreSQL configuration and controlled schema migration.
- HTTPS, public origins, secure sessions, CORS, real-time connectivity, health checks, logs, and recovery documentation.
- Public smoke tests for authentication, protected navigation, rooms, multiplayer, training, and privacy boundaries.

### Out of Scope

- New poker rules, game modes, strategy models, equity calculations, matchmaking rules, or trainer behavior.
- Real-money payments, wagering, billing, or user monetization.
- Custom domain purchase, DNS ownership, email delivery, marketing analytics, or SEO work.
- High-availability guarantees, autoscaling targets, disaster recovery across multiple regions, or enterprise compliance certification.
- Replacing the existing application architecture or rewriting the frontend/backend to fit a different provider.
