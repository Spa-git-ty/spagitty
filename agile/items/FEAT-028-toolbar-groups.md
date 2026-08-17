<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-028 — The toolbar: centred, grouped, and without Commit

**Status:** Built. Plan in `agile/plans/FEAT-028-plan.md`, tests in
`agile/testing/FEAT-028-automated.md` and `agile/testing/FEAT-028-sweep.md`.
**Screen:** the chrome, on every screen.

## Problem

Three things, all of them the row being older than the app around it:

1. A primary **Commit** button that could not commit. It navigated to the
   Working copy screen, which has the message box, the staged list and its own
   Commit. A primary button labelled "Commit 3 files" that then does not commit
   is a button that lies.
2. **Fetch** and **Push** carried "Not built yet" tooltips, though FEAT-022
   built both — the command palette has been running them for two commits.
3. Eight actions in one undifferentiated row, packed against the pickers.

## What was built

- The actions are **centred** and in **three groups** with dividers: history
  (Undo, Redo), remote (Fetch, Push, Clone), branch (Branch, Stash, Rebase).
- **Fetch and Push call `fetchAll()` and `pushCurrent()`** from
  `src/lib/graph/actions.ts` — the same functions the palette uses, reporting
  through the same notice — so an operation behaves identically wherever it is
  triggered.
- **Commit is gone**, and the staged count with it. Committing happens on
  Working copy, which is where the count can be acted on.
- Undo and Redo still say "Not built yet", because they still are.

## Acceptance criteria

1. No Commit button on the toolbar; `/changes` still has one. ✔
2. Fetch and Push actually fetch and push, and report either way. ✔
3. Three groups, two dividers, centred in the bar. ✔
4. Anything still unbuilt says so. ✔

## Dependencies

FEAT-022 (the fetch and push actions), FEAT-027 (the bar above it).
