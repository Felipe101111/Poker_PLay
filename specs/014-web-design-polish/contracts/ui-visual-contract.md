# Feature 014 UI Visual Contract

This contract defines presentation guarantees for the existing web application. It does not change HTTP, Socket.IO, authentication, poker-engine, or persistence contracts.

## Shared Theme Contract

Every included page MUST use the shared visual vocabulary:

- Primary foundation: black or accessible near-black neutral surfaces.
- Primary accent: green for primary action, selected navigation, focus, and positive emphasis.
- Semantic states: success, warning, error, informational, loading, disconnected, and completed states remain distinguishable through text, labels, icons, borders, or layout in addition to color.
- Typography and spacing: consistent hierarchy, readable line length, and stable control sizing.

## Page Contract

Every included page MUST provide:

- One clear page heading or equivalent accessible name.
- A visible indication of the current navigation location where shared navigation is present.
- A predictable content region that reflows at narrow widths.
- Visible focus for keyboard users.
- Accessible names for controls and form fields.
- Loading, empty, error, disabled, and completed states where the existing workflow can produce them.

## Poker-Specific Presentation Contract

The visual layer MUST preserve the meaning and visibility boundaries of existing poker data:

- Only data already authorized by the current server response may be displayed.
- Legal actions remain server-authoritative; visual emphasis must not imply that a disabled or unavailable action is legal.
- Player private cards and training feedback remain scoped to the authorized user.
- Current turn, pot, stacks, board, and feedback limitations remain readable and visually prioritized.

## Responsive Contract

At supported viewport sizes:

- Essential content and primary actions remain reachable without ordinary horizontal scrolling.
- Dense poker values, long names, feedback text, and status messages wrap or reflow without overlap.
- Navigation may collapse or stack, but the current location and main destinations remain discoverable.
- Increased text size does not hide essential content.

## Accessibility Contract

- Keyboard focus is visible and tab order follows the visual workflow.
- Status meaning is not communicated by color alone.
- Text and essential controls meet the agreed WCAG 2.2 AA contrast target.
- Reduced-motion preference suppresses decorative movement without suppressing state changes or feedback.
