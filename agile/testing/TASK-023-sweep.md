<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-023 — Manual visual sweep

**Item:** [`agile/items/TASK-023-flat-ui-remove-gradients.md`](../items/TASK-023-flat-ui-remove-gradients.md)

| Ticket | Preconditions | Steps | Expected Result | Priority | Pass/Fail |
| --- | --- | --- | --- | --- | --- |
| SWEEP-001 | App running in light or dark theme | Inspect navigation rail, toolbar, and main panel headers | Surfaces render flat with solid background fills and clean borders; no glass sheen or radial light washes. | High | |
| SWEEP-002 | Repository opened with multiple commits | Inspect commit list rows, selected row, and message column | Selected commit row renders flat solid `var(--selection)`; no gradient fade across the row; message column scroll edges have clean flat lines. | High | |
| SWEEP-003 | Open Branches view with multiple branches | Inspect branch table rows and current branch highlight | Current branch row renders with flat selection background without gradient ramp. | Medium | |
| SWEEP-004 | Open Working Copy view with unstaged/conflicted files | Select files and view diff list | Conflicted and selected files display flat solid backgrounds. | Medium | |
| SWEEP-005 | Primary action button visible (e.g. Commit button) | Observe button resting, hover, active, and disabled states | Button displays solid accent fill and flat border; no animated conic border travel or gradient gloss. | High | |
| SWEEP-006 | Trigger a toast notice (e.g. via copy or git action) | Observe toast notification appearance | Toast notification renders with solid clean background and colored left accent bar without diagonal/horizontal gradient washes. | Medium | |
