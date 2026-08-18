<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-008 — Plan

**Item:** [`agile/items/TASK-008-branches-footer.md`](../items/TASK-008-branches-footer.md)
**Branch:** `task/TASK-008-branches-footer`
**Status:** implemented.

## Approach

Remove the sentence; make the footer conditional on there being an error, which
is the shape Stash and Settings took in TASK-007.

The judgement worth recording is **why a true sentence is still removed**. The
six TASK-007 removed were all true as well — truth was never the test. The test
is whether the sentence carries information the reader cannot see on the screen,
and this one does not: the Delete chip states its own reason in its `title`, at
the control the reason is about. A footer is the wrong place for it twice over —
too far from the thing it describes, and phrased as an announcement that the
application does nothing.

## Files

`src/routes/branches/+page.svelte` only. No test changes: no existing test
asserted the sentence, and asserting the absence of a string in a route
component that this suite does not mount would be a test that cannot fail.

## Risk

Negligible, with one thing to watch: the error branch must still render. Kept
and covered by `TASK-008-T2`.

## Rollback

Revert the branch. Six lines.

## Note for FEAT-013

When branch deletion is built, the Delete chip's `title` stops being the place
the rule lives and becomes a real action with a real confirmation. Nothing in
this item needs undoing then — the footer is already error-only.
