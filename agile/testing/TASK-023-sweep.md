<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-023 — Manual visual sweep

**Item:** [`agile/items/TASK-023-flat-ui-remove-gradients.md`](../items/TASK-023-flat-ui-remove-gradients.md)

| Ticket | Preconditions | Steps | Expected Result | Priority | Pass/Fail |
| --- | --- | --- | --- | --- | --- |
| SWEEP-001 | App running in light or dark theme | Inspect navigation rail, toolbar, window edges, and main panel headers | Surfaces render flat with solid background fills and clean borders; no window cast shadow, glass sheen, or glass rims. | High | |
| SWEEP-002 | Repository opened with multiple commits | Inspect commit list rows, selected row, and message column | Selected commit row renders flat solid `var(--selection)`; no gradient fade across row; message column has clean flat borders and no shadow overlays. | High | |
| SWEEP-003 | Open Branches, Tags, Stash, and Diff views | Inspect header/footer bars and list rows | Top header and bottom footer bars render flat without top/bottom drop shadows. | High | |
| SWEEP-004 | Open Working Copy view with unstaged/conflicted files | Select files and view diff list | Conflicted and selected files display flat solid backgrounds without gradients or box shadows. | Medium | |
| SWEEP-005 | Primary action button visible (e.g. Commit button) | Observe button resting, hover, active, and disabled states | Button displays solid accent fill and flat border; no animated conic glow travel, glossy sheen, or shadow halo. | High | |
| SWEEP-006 | Trigger a toast notice (e.g. via copy or git action) | Observe toast notification appearance | Toast notification renders with solid clean background and colored left accent bar without diagonal/horizontal gradient washes or heavy blur shadows. | Medium | |
