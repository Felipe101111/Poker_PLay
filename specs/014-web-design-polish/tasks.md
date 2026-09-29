---

description: "Task list for Feature 014 Web Design Polish"
---

# Tasks: Web Design Polish

**Input**: Design documents from `/specs/014-web-design-polish/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ui-visual-contract.md](contracts/ui-visual-contract.md), and [quickstart.md](quickstart.md)

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently after the shared presentation foundation is ready.

## Phase 1: Setup

**Purpose**: Establish the frontend presentation work area without changing domain behavior.

- [X] T001 [P] Record the Feature 014 baseline by running `npm.cmd run build`, `npm.cmd run lint`, and `npm.cmd test -- --run` from `frontend/`, and document any pre-existing failures in `specs/014-web-design-polish/quickstart.md`.

---

## Phase 2: Foundational Presentation Layer

**Purpose**: Create the shared visual primitives required by every user story.

- [X] T002 [P] Define black/near-black surfaces, green accent tokens, semantic state tokens, typography scale, spacing scale, control sizing, focus ring, and content-width variables in `frontend/src/styles/theme.css`, preserving readable contrast and non-color status cues from `contracts/ui-visual-contract.md`.
- [X] T003 Add global reset, document defaults, form/control styles, responsive layout utilities, visible focus rules, and `prefers-reduced-motion` behavior in `frontend/src/styles/global.css`, using the tokens from `frontend/src/styles/theme.css`.
- [X] T004 [P] Create shared `AppShell`, navigation, page-header, surface, status-message, and action-group presentation components in `frontend/src/components/`, with accessible names, logical landmarks, and no changes to service or route behavior.
- [X] T005 Integrate the global styles and shared `AppShell` into `frontend/src/main.tsx` and `frontend/src/App.tsx`, preserving every existing route and authenticated data flow.

**Checkpoint**: The shared presentation foundation renders with the requested palette and remains behaviorally neutral before route-specific migration begins.

---

## Phase 3: User Story 1 - Cohesive Black and Green Visual Identity (Priority: P1) 🎯 MVP

**Goal**: Apply one consistent visual language across the main product surfaces and states.

**Independent Test**: Navigate through authentication, rooms, table, trainer, history, analytics, and administration screens and verify that surfaces, typography, controls, selected states, and feedback use the shared black-and-green language without reducing readability.

### Implementation for User Story 1

- [X] T006 [P] [US1] Migrate `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/RegisterPage.tsx`, `frontend/src/pages/ProfilePage.tsx`, and `frontend/src/pages/FriendsPage.tsx` to shared shell, form, surface, action, loading, empty, success, and error presentation patterns.
- [X] T007 [P] [US1] Migrate `frontend/src/pages/RoomsPage.tsx`, `frontend/src/pages/LocalGamePage.tsx`, `frontend/src/pages/MultiplayerTablePage.tsx`, and `frontend/src/pages/MultiplayerTrainingPage.tsx` to shared black/green surfaces, controls, headings, status messages, and poker-information hierarchy without changing action handling.
- [X] T008 [P] [US1] Migrate `frontend/src/pages/TrainerPage.tsx`, `frontend/src/pages/TrainerProgressPage.tsx`, `frontend/src/pages/HandHistoryPage.tsx`, `frontend/src/pages/HandHistoryDetailPage.tsx`, `frontend/src/pages/HandReplayPage.tsx`, `frontend/src/pages/AnalyticsPage.tsx`, and `frontend/src/pages/StrategyAdministrationPage.tsx` to the shared visual language and state semantics.
- [X] T009 [US1] Add representative visual-language assertions for shared shell, primary actions, selected navigation, semantic states, and accessible names in `frontend/tests/design-system.test.tsx`, then verify the User Story 1 independent test with the screens listed in `specs/014-web-design-polish/quickstart.md`.

**Checkpoint**: User Story 1 is independently demonstrable as a consistent black-and-green visual refresh across all primary screens.

---

## Phase 4: User Story 2 - Clear and Efficient Poker Workflows (Priority: P1)

**Goal**: Make table state, legal actions, training feedback, navigation, and next actions easy to scan without changing their behavior.

**Independent Test**: Complete a representative room, table, trainer, and multiplayer-training workflow and identify the current state and next relevant action at every step.

### Implementation for User Story 2

- [ ] T010 [P] [US2] Refine table and game presentation in `frontend/src/pages/MultiplayerTablePage.tsx` and `frontend/src/pages/LocalGamePage.tsx` so turn ownership, board, pot, stacks, private cards, legal actions, loading, disconnected, and completed states have stable visual priority while server acknowledgements remain authoritative.
- [ ] T011 [P] [US2] Refine trainer and feedback presentation in `frontend/src/pages/TrainerPage.tsx`, `frontend/src/pages/TrainerProgressPage.tsx`, and `frontend/src/pages/MultiplayerTrainingPage.tsx` so context, action controls, evaluation category, limitations, and private feedback are separated and readable.
- [ ] T012 [US2] Refine navigation and page hierarchy in `frontend/src/components/AppShell.tsx`, `frontend/src/components/Navigation.tsx`, and the route pages that use them so current location, primary destinations, and next actions remain discoverable in expanded and compact layouts.
- [ ] T013 [US2] Add workflow presentation coverage for legal-action emphasis, server-error acknowledgement, trainer limitation messaging, private feedback visibility, and current-location navigation in `frontend/tests/poker-workflow-presentation.test.tsx`.

**Checkpoint**: User Story 2 is independently demonstrable through room, table, trainer, and feedback workflows with unchanged domain outcomes.

---

## Phase 5: User Story 3 - Responsive and Accessible Presentation (Priority: P2)

**Goal**: Keep the polished interface usable at narrow and wide viewports and for keyboard, text-resize, color-vision, and reduced-motion needs.

**Independent Test**: Review representative screens at mobile and desktop widths, navigate the principal workflows with a keyboard, enlarge text, and enable reduced motion; confirm no essential content or action is clipped, hidden, overlapped, or conveyed by color alone.

### Implementation for User Story 3

- [X] T014 [P] [US3] Add responsive grid, stacking, wrapping, overflow, and content-width rules for navigation, page shell, forms, tables, poker panels, feedback panels, and dense values in `frontend/src/styles/global.css` and `frontend/src/components/` without ordinary horizontal scrolling.
- [ ] T015 [P] [US3] Audit and repair accessible labels, landmarks, heading order, button/input names, disabled-state messaging, and visible keyboard focus across `frontend/src/components/` and all files under `frontend/src/pages/`.
- [X] T016 [US3] Add reduced-motion and non-color status treatments for loading, success, warning, error, disconnected, and completed states in `frontend/src/styles/global.css` and the shared status components under `frontend/src/components/`.
- [ ] T017 [US3] Add responsive and accessibility regression coverage for keyboard focus, accessible names, status semantics, text reflow, and reduced-motion behavior in `frontend/tests/design-accessibility.test.tsx`.

**Checkpoint**: User Story 3 is independently demonstrable at representative viewport sizes and interaction modes.

---

## Phase 6: Polish and Cross-Cutting Validation

**Purpose**: Verify the full feature, remove visual drift, and preserve existing behavior.

- [X] T018 [P] Update `specs/014-web-design-polish/quickstart.md` with the final screen inventory, known viewport assumptions, and any baseline validation notes discovered during implementation.
- [X] T019 Run `npm.cmd run build`, `npm.cmd run lint`, and `npm.cmd test -- --run` from `frontend/`; fix Feature 014 regressions in `frontend/src/` and `frontend/tests/` before proceeding.
- [ ] T020 Run the manual responsive/accessibility review from `specs/014-web-design-polish/quickstart.md` across representative loading, empty, error, active, disabled, disconnected, and completed states; record unresolved issues in the quickstart and do not mark the feature complete while acceptance criteria fail.
- [ ] T021 Verify that no backend, service, route, poker-engine, private-information, or server-authority behavior changed by reviewing `git diff` and the existing frontend regression suite; document the result in `specs/014-web-design-polish/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; establishes the baseline and records unrelated failures.
- **Foundational (Phase 2)**: Depends on T001; blocks all user story work because every story uses the shared theme and shell.
- **User Story 1 (Phase 3)**: Depends on T002-T005; MVP and visual-language baseline.
- **User Story 2 (Phase 4)**: Depends on T002-T005 and integrates with the shared components; can be developed in parallel with US1 after the foundation, but final integration should follow the shared migration patterns.
- **User Story 3 (Phase 5)**: Depends on T002-T005; responsive and accessibility work can proceed in parallel with route migration, with final fixes applied after US1 and US2 surfaces exist.
- **Polish (Phase 6)**: Depends on the desired user stories and their checkpoints being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2; no dependency on another story. Recommended MVP.
- **User Story 2 (P1)**: Can start after Phase 2; depends on shared components but is independently testable through poker workflows.
- **User Story 3 (P2)**: Can start after Phase 2; depends on the shared tokens and shell, but its acceptance review is independent of poker business logic.

### Within Each User Story

- Shared presentation foundation must exist before route migration.
- Implementation tasks for different files marked `[P]` may run in parallel.
- Story-specific coverage should be added with the implementation it validates and must pass at the story checkpoint.
- Cross-cutting validation occurs only after the story checkpoint for the relevant surfaces.

## Parallel Opportunities

- After T001, T002 and the initial component scaffolding in T004 can be started in parallel; T003 follows T002, and T005 follows T003/T004.
- After Phase 2, T006, T007, and T008 can run in parallel because they target separate page groups.
- Within User Story 2, T010 and T011 can run in parallel; T012 should follow the shared shell integration.
- Within User Story 3, T014, T015, and T016 can run in parallel when they touch separate style/component regions; T017 follows the resulting behavior.
- T018 can be updated in parallel with final code review, while T019-T021 should run after implementation changes settle.

## Parallel Example: User Story 1

```text
Task: "T006 Migrate authentication, profile, and friends pages to shared presentation"
Task: "T007 Migrate rooms, local game, multiplayer table, and multiplayer training pages"
Task: "T008 Migrate trainer, history, replay, analytics, and administration pages"
```

## Parallel Example: User Story 2

```text
Task: "T010 Refine table and local game workflow presentation"
Task: "T011 Refine trainer and multiplayer feedback presentation"
```

## Parallel Example: User Story 3

```text
Task: "T014 Add responsive layout rules"
Task: "T015 Audit keyboard and accessible naming behavior"
Task: "T016 Add reduced-motion and non-color state treatments"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001 baseline.
2. Complete T002-T005 shared foundation.
3. Complete T006-T009 User Story 1.
4. Run the User Story 1 independent test and frontend validation.
5. Stop for review/demo if the black-and-green identity is ready.

### Incremental Delivery

1. Deliver the shared foundation and visual identity MVP.
2. Add User Story 2 to improve poker and training workflow scanning.
3. Add User Story 3 for responsive and accessibility completeness.
4. Complete Phase 6 validation and document the final result.

## Notes

- Every task uses the required `- [ ] T###` checklist format; story tasks include `[US1]`, `[US2]`, or `[US3]` and parallelizable tasks include `[P]` only where file/dependency boundaries permit.
- Backend, API, socket, database, poker-engine, authentication, authorization, and private-information behavior are intentionally outside the implementation task set.
