<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-047 — The branches table: resizable columns, and a divergence worth reading

**Status:** Open on `feature/FEAT-047-branch-table-columns`. The column store is
extracted; the branch table and the divergence bar are not built yet.
**Screen:** Branches (1F).
**Requested by:** the author, 2026-08-18, as request 8 of the interface sweep.

## Why this identifier

The intake document
[`2026-08-18-intake-interface-sweep.md`](../plans/2026-08-18-intake-interface-sweep.md)
filed request 8 under `FEAT-033`, which was already taken: that identifier is
*Branch divergence on the chip*, recorded by TASK-012 and cited by FEAT-036.
Amendment 12 forbids reusing an identifier, so request 8 is this item and
FEAT-033 keeps its own meaning and stays in the backlog.

## Problem

Two things, both in `BranchTable.svelte`:

1. **The columns are hardcoded.** `grid-template-columns: minmax(0,1fr) 90px
   220px 210px`. The graph has had order, per-column widths, minimums, a filling
   column and per-repository persistence since FEAT-022, and none of that
   machinery was ever about commits.
2. **`↑2 ↓3` in a 90px mono cell.** The author's verdict is "awful". It reads
   worst in exactly the case that matters — a branch that is both ahead and
   behind.

## Wanted

- The branch table's columns resize, and remember their widths per repository.
- A **divergence bar** in place of the text: a fixed-width two-sided bar with
  the branch's own position at the centre, behind to the left and ahead to the
  right, each segment scaled against the widest divergence on screen, in the
  lane palette. Four states, each distinct at a glance: no upstream (the bar is
  absent, not a dash), level (a centre tick), one-sided, and both.
- The `title` keeps carrying the sentence, so nothing is glyph-only.

**Chosen by the author, 2026-08-24**, over the alternative of two sortable
numeric columns. Amendment 8: a taste decision, settled before it was built.

## Non-scope

- The graph's columns, whose behaviour must not change at all.
- How ahead/behind are counted. The backend read is built and tested.
- Sorting, and hiding or reordering the branch table's columns. Resizing is
  what was asked for.

## Acceptance criteria

- The branch table's columns can be dragged, and come back that way.
- The graph's columns behave exactly as before, and the lane canvas still sits
  in the graph column's own slot.
- A branch that is ahead, behind, both, level, or has no upstream is
  distinguishable at a glance without reading a number.
- The counts on the bar and the counts from the store never disagree.

## Dependencies

FEAT-022, which extracted the graph's column store in the first place.
FEAT-004's branch read, which already produces the counts.
