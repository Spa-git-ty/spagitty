<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-010 — Plan

**Item:** [`agile/items/BUG-010-case-insensitive-shadowing.md`](../items/BUG-010-case-insensitive-shadowing.md)
**Branch:** `feature/FEAT-019-commit-signing`
**Status:** fixed.

Not on a branch of its own. It was found by the first Windows build this stack
has ever had, the stack is unmerged, and a fix that only exists on a branch
nobody is building is not a fix.

## Approach

### Rename the component, not the store

`notice.svelte.ts` is imported in eighteen places and `Notice.svelte` in one.
`dialog.svelte.ts` in several and `Dialog.svelte` in one. Renaming the component
is the smaller change either way round, and it leaves the store named after what
it holds.

`NoticeToast` and `DialogHost` are not evasions of the collision — they are what
the two components are. One is the transient toast in the bottom-right corner;
the other is the host mounted once by the shell that renders whichever dialog
was asked for. `Notice` and `Dialog` were always the more general words, and
they belong to the store and the type.

### A test, because the shape will come back

The convention that produced this is a good one — `X.svelte` for a component,
`x.svelte.ts` for a rune store — and it is used correctly across the tree. It
only bites when the two land in the same directory with the same stem, and
nothing about writing either file makes that visible.

`tools/case.test.ts` has two checks:

- **No two paths differ only by case.** The general form: two files on Linux,
  one file on Windows.
- **No file is shadowed during import resolution.** The specific form:
  `a/x.svelte.ts` is reached by importing `a/x.svelte`, so a sibling `a/X.svelte`
  answers that import first wherever case is folded.

The second one found `Dialog` immediately, which is the argument for having
written it rather than fixing `Notice` and moving on.

It runs in the ordinary suite on Linux, where the collision is invisible to
everything else. That is the point: the check has to run where the bug does not
reproduce.

## What this does not do

- **Change gate 3 to run tests on Windows.** It would have caught this, and it
  would triple the cost of the gate that runs on every push to catch a class of
  bug a file-listing test catches for nothing.
- **Audit the `.svelte.ts` convention.** It is right. Only the collision is
  wrong, and the collision is now checked.
