# Feature Specification: User Authentication (Register, Login, Profile)

**Feature Branch**: `001-user-authentication`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Quiero desarrollar una aplicación web completa de Texas Hold'em No-Limit... (full product vision, see below). Primera feature seleccionada por el usuario: Autenticación (Register/Login/Perfil), Etapa 2-3 del roadmap del producto. Los usuarios deben poder registrarse, iniciar sesión, cerrar sesión y tener un perfil. Cada usuario debe tener ID, username, email, password almacenada de forma segura mediante hash, fecha de creación, perfil y (en features futuras) lista de amigos. Nunca guardar contraseñas en texto plano. Sistema de recuperación de contraseña preparado para implementarse posteriormente (fuera de alcance de esta feature)."

## Clarifications

### Session 2026-09-23

- Q: ¿Cuánto debe durar la sesión autenticada y cómo debe expirar? → A: Expira a los 7 días, se renueva con cada actividad (sliding expiration).
- Q: ¿Se debe normalizar email y username (minúsculas + espacios) al validar duplicados en el registro? → A: Sí, ambos se normalizan a minúsculas y sin espacios antes de comparar o almacenar como clave de unicidad.
- Q: ¿Cuál es la política mínima de contraseña que debe exigirse al registrar una cuenta? → A: Mínimo 8 caracteres, sin reglas de composición obligatorias (alineado con NIST 800-63B).
- Q: ¿El 'display name' editable del perfil es el mismo campo que el username de registro, o son dos campos separados? → A: Username = display name (un solo campo, editable después del registro, manteniendo unicidad normalizada).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register for a new account (Priority: P1)

A new visitor creates an account with a username, email, and password so they have a persistent identity on the platform.

**Why this priority**: Without an account, no other capability (friends, rooms, playing poker, using the Trainer) is reachable. This is the entry point for every future feature.

**Independent Test**: Can be fully tested by submitting a registration form with a unique username/email and a valid password, and verifying a new account is created and the password is never stored or returned in plaintext.

**Acceptance Scenarios**:

1. **Given** no account exists with a given email or username, **When** a visitor submits valid registration details, **Then** a new account is created and the user is informed of success.
2. **Given** an account already exists with the submitted email, **When** a visitor tries to register with that email, **Then** registration is rejected with a clear, non-revealing error message.
3. **Given** a visitor submits a password that does not meet the minimum strength policy, **When** they submit the registration form, **Then** registration is rejected and the specific policy requirement is explained.

---

### User Story 2 - Log in to an existing account (Priority: P1)

A returning user authenticates with their credentials to access their account and, in future features, the rest of the platform (friends, rooms, games, Trainer).

**Why this priority**: Equally critical to registration — an account with no way to log back in has no ongoing value.

**Independent Test**: Can be fully tested by attempting to log in with a previously registered account's correct and incorrect credentials, and verifying only correct credentials grant an authenticated session.

**Acceptance Scenarios**:

1. **Given** a registered account, **When** the user submits the correct credentials, **Then** an authenticated session is created and the user reaches their profile/home area.
2. **Given** a registered account, **When** the user submits an incorrect password, **Then** the login is rejected with a generic error that does not reveal whether the email/username or the password was wrong.
3. **Given** no account exists for the submitted identifier, **When** login is attempted, **Then** the login is rejected with the same generic error as an incorrect password (no account enumeration).

---

### User Story 3 - View and edit basic profile (Priority: P2)

An authenticated user views their profile information and edits the fields they are allowed to change (e.g., their username, which also serves as their display name), so their identity stays current.

**Why this priority**: Not required for the very first login, but needed soon after so users can personalize their identity before adding friends or joining rooms.

**Independent Test**: Can be fully tested by logging in, loading the profile view, editing an allowed field, and confirming the change persists and disallowed fields (e.g., user ID, account creation date) cannot be modified.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they open their profile, **Then** they see their username, email, and account creation date.
2. **Given** an authenticated user, **When** they update an editable profile field with a valid value, **Then** the change is saved and reflected on next profile view.
3. **Given** an authenticated user, **When** they attempt to submit a change to a non-editable field (e.g., user ID), **Then** the system ignores or rejects that part of the request.

---

### User Story 4 - Log out of the session (Priority: P3)

An authenticated user ends their session on a shared or public device so their account cannot be used by someone else afterward.

**Why this priority**: Important for security hygiene but not blocking for the core value of registering, logging in, and using the account.

**Independent Test**: Can be fully tested by logging in, triggering logout, and verifying subsequent requests to protected functionality are rejected until the user logs in again.

**Acceptance Scenarios**:

1. **Given** an authenticated session, **When** the user logs out, **Then** the session is terminated and protected pages redirect to login.
2. **Given** a logged-out session, **When** a request is made to a protected endpoint using the old session, **Then** the request is rejected as unauthenticated.

---

### Edge Cases

- What happens when a user submits registration or login requests far above a normal rate (automated/bot behavior)?
- How does the system handle a user who registers but the client disconnects before receiving confirmation (did the account get created or not)?
- What happens when a user requests password recovery before that feature exists? (Must show a clear "not yet available" message rather than a broken flow — recovery itself is out of scope for this feature.)
- What happens when an authenticated user's session is used from two different devices at the same time?
- How does the system handle profile edits with invalid data (e.g., empty username, disallowed characters, or a username already taken by another account)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a new visitor to register an account by providing a username, email, and password.
- **FR-002**: System MUST validate that submitted email addresses are well-formed before accepting a registration.
- **FR-003**: System MUST reject registration when the email is already associated with an existing account, and MUST reject registration when the username is already in use, without revealing which specific existing account matches. Email and username MUST be normalized (lowercased, surrounding whitespace trimmed) before this uniqueness check and before storage, so variants differing only by case or whitespace are treated as the same identifier.
- **FR-004**: System MUST enforce a minimum password length of 8 characters at registration time (no mandatory composition rules such as forced symbols/uppercase, per NIST 800-63B guidance) and communicate unmet requirements to the user.
- **FR-005**: System MUST store passwords using a secure, one-way hashing mechanism and MUST NOT store or log passwords in plaintext at any point (Constitution Principle 5).
- **FR-006**: System MUST allow a registered user to log in by presenting valid credentials.
- **FR-007**: System MUST reject login attempts with invalid credentials using a generic error that does not reveal whether the account exists or which field was incorrect.
- **FR-008**: System MUST create an authenticated session upon successful login and MUST reject access to authenticated-only functionality without one. The session MUST expire after 7 days of inactivity, and any authenticated request MUST reset (slide) that expiration window.
- **FR-009**: System MUST allow an authenticated user to explicitly log out, terminating their session so it can no longer be used to access authenticated-only functionality.
- **FR-010**: System MUST allow an authenticated user to view their own profile information, including at least username, email, and account creation date.
- **FR-011**: System MUST allow an authenticated user to edit their username (which also serves as their display name) — subject to the same normalization and uniqueness rules as FR-003 — while preventing edits to authoritative identifiers (user ID, account creation date).
- **FR-012**: System MUST assign every registered user a unique, persistent user identity (User ID) suitable for later association with friends, rooms, tournament participation, poker history, and Trainer history (Constitution Principle 21), even though those associations are built in later features.
- **FR-013**: System MUST treat all authentication-related input as untrusted and validate it server-side regardless of any client-side validation (Constitution Principle 3).
- **FR-014**: System MUST NOT implement password recovery/reset in this feature, but the account data model MUST NOT preclude adding it later (e.g., must support attaching a reset token/flow to an existing account without restructuring identity data).
- **FR-015**: System MUST allow a newly registered user to log in immediately after registration, without requiring email verification.
- **FR-016**: System MUST NOT implement account lockout or rate limiting on repeated failed login attempts in this first iteration; this is explicitly deferred to a later security-hardening feature (see Assumptions).
- **FR-017**: Users MUST log in using their email address as the unique authentication identifier. Username is a display-only attribute and is not used to authenticate.

### Key Entities *(include if feature involves data)*

- **User**: Represents a registered platform member. Attributes include a unique User ID, username (also used as the display name; editable post-registration, unique and normalized), email, a securely hashed password, and account creation date. Serves as the anchor identity that later features (friends, rooms, poker history, Trainer history) will attach to.
- **Session**: Represents an authenticated login instance for a User, used to authorize access to authenticated-only functionality until logout or expiration. Expires after 7 days of inactivity; each authenticated request slides (renews) the expiration window.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can complete registration in under 2 minutes.
- **SC-002**: A returning user can log in and reach their profile/home area in under 15 seconds under normal conditions.
- **SC-003**: 100% of stored passwords are irreversibly hashed; a database inspection never reveals a plaintext or reversibly-encrypted password.
- **SC-004**: 0% of failed login attempts reveal whether the submitted email/username corresponds to an existing account.
- **SC-005**: 95% of users attempting to view or edit their profile complete the action successfully on the first attempt.
- **SC-006**: After logout, 100% of subsequent attempts to use the previous session against authenticated-only functionality are rejected.

## Assumptions

- Registration requires both a username and an email (not just one), since the product vision references both as distinct user attributes.
- Authentication is session-based (not third-party SSO/OAuth) for this first iteration, matching a simple virtual-chips platform with no external identity requirements specified.
- Profile editing in this feature is limited to basic identity fields (e.g., display name); richer profile features (avatars, statistics, Trainer history display) are deferred to later features.
- Friends, rooms, poker games, and Trainer functionality are explicitly out of scope for this feature — this spec only covers the account identity and session lifecycle they will depend on.
- Password recovery/reset is out of scope for this feature but is called out as a near-term follow-up feature per the product vision.
- Username remains unique at registration time (even though it is not used for login) to keep it safe for later use in friend search/discovery features.

### Documented Temporary Constitutional Exception

- **Violated principle**: Article II, Principle 3 ("Rate limiting where appropriate") and general brute-force protection expectations.
- **Reason**: User explicitly chose to ship this first iteration without login lockout/rate limiting to keep initial scope minimal.
- **Affected component**: Login endpoint / authentication service.
- **Intended resolution**: A follow-up security-hardening feature must add rate limiting and/or account lockout after repeated failed login attempts before the platform handles real user traffic at scale.
- **Status**: Temporary — must be revisited before production launch.
