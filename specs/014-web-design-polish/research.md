# Feature 014 Research: Web Design Polish

## Decision 1: Introduce a shared visual foundation in the existing frontend

- **Decision**: Add a small shared presentation foundation for design tokens, page shell, navigation treatment, surfaces, controls, status messages, focus states, responsive layout, and reduced-motion behavior. Apply it incrementally to existing pages rather than replacing the application structure.
- **Rationale**: The current frontend has no global stylesheet or shared visual system; pages are mostly semantic markup without classes. A shared foundation is the smallest approach that can make the black-and-green identity consistent across many routes while preserving each page's domain behavior.
- **Alternatives considered**:
  - Styling each page independently: rejected because colors, spacing, states, and accessibility behavior would drift.
  - Introducing a full component-library dependency: rejected because the feature is a visual polish and the existing dependency set has no component library; the added maintenance and migration scope are not justified.
  - Rewriting the frontend shell: rejected because it would increase regression risk and violate the incremental-development principle.

## Decision 2: Use black/near-black neutrals with green as the primary accent

- **Decision**: Use layered near-black surfaces for page background, navigation, panels, and controls; use a restrained green scale for primary action, selection, focus, and positive emphasis. Keep warning, error, and informational states distinguishable through semantic colors, labels, icons, and text in addition to hue.
- **Rationale**: Pure black everywhere would flatten hierarchy and can reduce readability. Layered neutrals preserve the requested black identity, while green remains the recognizable secondary color without becoming the only status signal.
- **Alternatives considered**:
  - Pure black and bright green for every state: rejected because it risks glare, poor contrast, and color-only meaning.
  - Green-dominant interface with black accents: rejected because it reverses the requested visual priority.
  - Dark blue or purple palette: rejected because it conflicts with the requested direction and project brief.

## Decision 3: Accessibility target is WCAG 2.2 AA behavior

- **Decision**: Design for WCAG 2.2 AA contrast and interaction expectations: readable text, visible keyboard focus, logical tab order, accessible names, text resizing, non-color status communication, and reduced motion.
- **Rationale**: The spec explicitly requires contrast, keyboard access, color-vision support, and reduced motion. WCAG 2.2 AA is a clear, technology-agnostic baseline for those outcomes.
- **Alternatives considered**:
  - Treating accessibility as a later visual QA step: rejected because token and component choices determine contrast and focus behavior.
  - Relying on color contrast alone: rejected because poker status and feedback must remain understandable without color alone.

## Decision 4: Validate visual changes at the presentation boundary

- **Decision**: Keep backend, poker engine, routes, data contracts, and authorization unchanged. Validate UI behavior with existing React Testing Library/Vitest tests, TypeScript build, lint, and a repeatable manual viewport/state review.
- **Rationale**: Feature 014 changes presentation, not domain behavior. Boundary-focused validation catches visual regressions while protecting server authority, private information, and existing workflows.
- **Alternatives considered**:
  - Adding backend changes to support visual state: rejected because current APIs already expose the required state and this would expand scope.
  - Testing only the production build: rejected because build success does not verify keyboard behavior, states, or responsive layout.

## Decision 5: Use CSS media preferences for responsive and motion requirements

- **Decision**: Use responsive CSS constraints and `prefers-reduced-motion` behavior for layout and motion adaptation, with content and actions remaining available in every state.
- **Rationale**: These requirements are presentation concerns and should work without JavaScript-only viewport or motion detection. CSS media preferences also reduce runtime complexity and preserve behavior when scripts are busy or unavailable.
- **Alternatives considered**:
  - JavaScript-driven layout branches: rejected because they duplicate browser layout logic and create resize edge cases.
  - Removing all transitions: rejected because restrained state transitions can aid comprehension when motion preferences allow them.
