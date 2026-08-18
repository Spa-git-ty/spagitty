<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-013 — Plan

**Item:** [`agile/items/TASK-013-backfill-document-sets.md`](../items/TASK-013-backfill-document-sets.md)
**Branch:** `task/TASK-013-backfill-documents`, stacked on
`task/TASK-012-record-drift`.
**Status:** implemented.

## Approach

Write each document from the artefacts that survive, and mark what is recovered.

For every one of the five items the sources are the same, in this order of
authority:

1. **The code**, as it is now.
2. **The commit message**, which in this project carries the argument rather
   than a summary — several of these documents quote it instead of paraphrasing.
3. **The tests**, which say what was actually held in place rather than what was
   intended.
4. **The item document**, which says what was asked for — and is the one source
   that can disagree with the tree.

Every backfilled document says at the top that it is backfilled. A plan written
after the work is a reconstruction, and pretending otherwise would put the same
kind of falsehood in the record that TASK-012 just took out.

### When a source disagrees with the tree, the tree wins and the item changes

That happened once, and it is the reason this task was worth doing rather than
worth skipping. FEAT-018's item was marked `Done` by TASK-012 from its live
toolbar buttons. Reading the code to write the plan showed three of its five
scoped things were never built, and that `shell::fetch` passes `--prune`
unconditionally — silent, on every fetch, deleting remote-tracking refs, which
the item's own notes call destructive in the sense Amendment 6 means.

So FEAT-018 becomes `Partial`, its plan carries a **What is still owed** section
in priority order, and its automated-test document carries a section saying which
gaps the tests do *not* cover — including that the test named *nothing is lost by
fetching* is true of the working copy and false of remote-tracking refs.

### What each kind of document is for here

- **Plan** — the decisions and the alternatives that were rejected. Where the
  reasoning survives only in a commit message, it is quoted and attributed.
- **Automated** — the tests that exist, named, each with the thing it holds in
  place, plus what is deliberately not covered. Never a claim that a test exists
  when it does not.
- **Sweep** — the manual checks, including the ones that can only be done
  against a real remote or a real repository. For TASK-011 that is the only
  check that distinguishes a live gate from a decorative one, so it is written
  as a procedure someone can follow.

## Files

`agile/plans/{FEAT-018,FEAT-036,FEAT-038,FEAT-039,TASK-011}-plan.md`
`agile/testing/{FEAT-018,FEAT-036,FEAT-038,FEAT-039,TASK-011}-{automated,sweep}.md`
`agile/items/FEAT-018-fetch-and-push.md` — status corrected, and a **What
actually shipped** section.
`agile/README.md` — FEAT-018's status, and the outstanding rows closed as each
set landed.
This item's own four documents.

## Testing

`tools/record.test.ts`, which TASK-012 built for exactly this: it fails on a
stale row in the outstanding table, so a set of documents cannot be written
without the debt being cleared, and the debt cannot be cleared without the
documents. It caught two stale rows during this work.

## Risk

The risk of backfilling is a plausible reconstruction that is wrong — a
confident sentence about why something was done, invented after the fact and
then quoted by the next reader as though it were a record. Two things hold
against it: every document says it was backfilled, and anything not recoverable
is written as unknown rather than filled in.

## Rollback

Revert the branch. It is documents, one status line, and the index rows that
match them.
