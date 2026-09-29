# Feature 014 Quickstart: Web Design Polish

## Purpose

Validate that the visual polish applies the black-and-green identity consistently, improves scanning, and preserves existing poker workflows, privacy, and server-authoritative behavior.

## Prerequisites

- Node.js 20 or newer.
- Dependencies installed in `frontend/`.
- The existing backend available when validating authenticated or live-data screens.
- A test account or the existing authenticated test setup.

## Automated Checks

From `frontend/`:

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test -- --run
```

Expected outcomes:

- TypeScript and production build complete without errors.
- Lint reports no new violations.
- Existing React Testing Library/Vitest tests pass, including privacy, accessibility, trainer, table, history, analytics, and administration coverage.

### Baseline recorded before Feature 014

- Build: passed.
- Tests: 23 files and 36 tests passed.
- Lint: passed with the pre-existing `AnalyticsPage.tsx` missing-`filters` dependency warning.
- Informational test output: React Router v7 future-flag warnings remain in the existing test suite.

### Feature 014 validation after implementation

- Build: passed after shared shell, page migration, responsive CSS, and design-system test changes.
- Tests: 24 files and 38 tests passed, including the new `design-system.test.tsx` coverage.
- Lint: passed with the same pre-existing TypeScript version notice and `AnalyticsPage.tsx` missing-`filters` dependency warning.
- Responsive assumptions: the primary mobile breakpoint is 720px; dense tables may scroll within their own bounded region rather than causing page-level overflow.

## Manual Visual Review

Run the frontend using the existing development command:

```powershell
npm.cmd run dev
```

Review representative screens at a wide desktop viewport and a narrow mobile viewport:

1. Login and registration: surface hierarchy, form labels, focus, validation/error states, and primary action.
2. Rooms and lobby: navigation location, room lists, forms, empty states, invitations, and action hierarchy.
3. Live table and local game: board, stacks, pot, turn indication, legal actions, private cards, loading, disconnected, and completed states.
4. Trainer and multiplayer training: scenario context, action controls, feedback category, limitations, and empty/loading/error states.
5. Hand history, replay, and analytics: filters, dense tables, empty results, loading, error, and detail navigation.
6. Strategy administration and profile/friends: forms, selected states, governance/status messaging, and responsive layout.

For each screen verify:

- Black or near-black surfaces are the primary foundation and green is the consistent primary accent.
- Text, controls, focus rings, and status indicators remain readable.
- Meaning is not conveyed by green/red color alone.
- No essential content overlaps, clips, or requires ordinary horizontal scrolling.
- Keyboard navigation reaches every primary action in a logical order.
- Enabling reduced motion removes decorative motion while preserving state changes.

## Regression Checks

- Complete one room creation/join/readiness flow.
- Complete one legal table action and confirm the displayed state comes from the server response.
- Complete one trainer decision and inspect its feedback.
- Open one hand-history detail/replay and one analytics view.
- Confirm private cards and private training feedback remain scoped to the authorized user.

Expected outcome: all workflows retain their existing functional behavior while using the shared visual language.

## Related Contracts

- [UI visual contract](contracts/ui-visual-contract.md)
- [Presentation data model](data-model.md)
