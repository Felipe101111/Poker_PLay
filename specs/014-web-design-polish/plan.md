# Implementation Plan: Web Design Polish

**Branch**: `014-web-design-polish` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/014-web-design-polish/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Create a consistent, accessible black-and-green visual system for the existing poker web application. The implementation will add shared presentation tokens and layout primitives, apply them incrementally across the existing route pages, and preserve all current server-authoritative poker behavior, private-information boundaries, and service contracts. Validation will combine the existing frontend build, lint, component tests, and a repeatable responsive/accessibility review of representative states.

## Technical Context

**Language/Version**: TypeScript 5.5, React 18.3, CSS

**Primary Dependencies**: React 18, React Router 6, Vite 5, existing CSS platform APIs; no new UI dependency planned

**Storage**: N/A for the visual layer; existing backend persistence remains unchanged

**Testing**: Vitest, React Testing Library, TypeScript build, ESLint, manual responsive and accessibility review

**Target Platform**: Existing browser-based frontend on supported desktop, tablet, and mobile viewports

**Project Type**: Web application frontend with an existing Node/Express backend

**Performance Goals**: Visual changes must not add blocking startup work or make ordinary interaction feel delayed; layout must remain stable while content loads and reflows

**Constraints**: Preserve existing routes, data contracts, server authority, private information, and behavior; meet WCAG 2.2 AA contrast and keyboard/focus expectations; support reduced motion

**Scale/Scope**: Existing frontend route pages covering authentication, rooms, local/multiplayer tables, trainer, training feedback, history/replay, analytics, profile/friends, and administration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **PASS**: Presentation remains separate from poker rules, server authority, strategy/equity logic, persistence, and transport behavior (Principles 1, 6-8, 18).
- **PASS**: No client-side authority or private-information exposure is introduced; existing services and authorized responses remain the source of truth (Principles 3-4, 18-20, 23).
- **PASS**: The change is incremental, testable, and limited to the existing frontend presentation boundary (Principles 26-30, 35-36).
- **PASS**: Responsive, keyboard, contrast, reduced-motion, and state coverage are explicitly represented in the spec, contract, and quickstart (Principles 15, 27, 31-32).
- **PASS**: No new persisted data, external service, framework, or vendor dependency is required (Principles 33-34).

## Project Structure

### Documentation (this feature)

```text
specs/014-web-design-polish/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/                    # unchanged backend; no Feature 014 domain edits planned
└── tests/                  # unchanged backend regression coverage

frontend/
├── src/
│   ├── components/         # shared shell, navigation, controls, status, and visual primitives
│   ├── pages/              # existing route pages migrated incrementally to shared presentation
│   ├── services/           # unchanged data and socket services
│   ├── styles/             # global tokens, base styles, responsive and motion rules
│   └── App.tsx             # shared route shell integration
└── tests/                  # existing and new presentation/accessibility coverage
```

**Structure Decision**: Use the existing two-part web application structure. Feature 014 is frontend-only at the domain boundary: shared styles/components are added under `frontend/src/`, existing pages are updated in place, and `frontend/tests/` receives focused presentation coverage. Backend services, routes, schemas, and poker-engine modules remain unchanged.

## Complexity Tracking

No constitution violations identified; no complexity exception is required.
