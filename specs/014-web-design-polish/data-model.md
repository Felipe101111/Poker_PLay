# Feature 014 Data Model: Web Design Polish

Feature 014 does not add persisted domain data. The following presentation entities are conceptual contracts used to keep the visual system consistent.

## Visual Theme

Represents the shared visual vocabulary used by all included screens.

| Field | Type | Rules |
|---|---|---|
| `surface` | color token group | Near-black foundation with enough separation between page, navigation, panel, and elevated surfaces |
| `accent` | color token group | Green is the primary interactive and selected-state accent |
| `text` | color token group | Primary, secondary, muted, and inverse text must remain readable on their surfaces |
| `semantic` | color token group | Success, warning, error, and informational treatments must not rely on hue alone |
| `focus` | color token | Visible on both dark and elevated surfaces |
| `motion` | preference behavior | Reduced motion removes decorative movement but preserves state changes |

## Page Shell

Represents the common frame around a page's domain content.

- **Inputs**: page title, current navigation destination, optional status message, page content, optional secondary actions.
- **Outputs**: consistent navigation, heading hierarchy, content width, page spacing, status placement, and responsive regions.
- **Rules**: must not alter route authorization, domain state, private information, or action semantics.

## Interactive State

Represents a visible state of a control or workflow element.

Allowed states:

- Default
- Hover or pointer indication
- Focus-visible
- Active or selected
- Disabled
- Loading
- Success
- Warning
- Error
- Informational
- Disconnected
- Completed
- Empty

Each state must have a non-color cue where meaning matters, such as text, icon, border, label, position, or control behavior.

## Responsive Layout State

Represents how a shared page region behaves at a viewport size.

- **Wide**: navigation and primary content may use multiple columns where it improves scanning.
- **Compact**: secondary regions may stack or collapse while primary actions remain visible.
- **Narrow**: content reflows into a single readable flow; essential actions remain reachable without horizontal scrolling.
- **Text enlarged**: labels and values wrap or reflow without clipping or overlapping.

## Relationships and Constraints

- A page shell uses one visual theme and may contain multiple interactive states.
- A domain page may render multiple responsive layout states without changing domain data.
- Existing table, trainer, history, analytics, and administration data remain owned by their current services and server contracts.
- No visual entity is persisted or exposed as poker-domain state.
