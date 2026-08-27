<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-009 — Interactive rebase (1E)

**Status:** Done.
**Branch:** `feature/FEAT-009-rebase`.
**Route:** `/rebase`. **Rail:** "Rebase". Also the toolbar's Rebase button.

## Problem

Interactive rebase is the most powerful and most feared operation in git,
because the todo list is edited blind: you choose squash and reword against a
list of SHAs and find out what you did afterwards.

## Motivation

The whole argument for a rebase screen is the preview. `shell.rs` already
records the split: the plan is computed in Rust, `git rebase -i` executes it.
This item builds the half that carries the value and none of the risk.

## Scope

- The todo list: one row per commit, with a drag handle and an action chip —
  pick, squash, reword, drop.
- Reordering by drag.
- A recomputed result preview: what history would look like after the plan,
  including which commits merge into which.
- Choosing the upstream the rebase would be onto.
- A plain statement of what the reflog keeps and for how long.

## Non-scope

- Executing the rebase — FEAT-015. The Apply button renders disabled and says
  what will run when it is built.
- Editing commit messages inline; reword is recorded in the plan, and the
  message is asked for at execution time, which is git's own behaviour.
- Conflict resolution during a rebase — that is FEAT-016 territory.
- `exec` lines, autosquash, and rebasing merges (`--rebase-merges`).

## Acceptance criteria

1. The todo list for a chosen upstream matches, line for line, what
   `git rebase -i <upstream>` would open, before any edit.
2. Reordering, squashing, rewording and dropping update the preview immediately
   and consistently — a squash removes a row from the result and folds its
   changes into the row above.
3. Dropping every commit produces an empty preview and a warning, not an error.
4. A plan that would conflict is flagged in the preview as "may conflict"
   rather than silently claiming a clean result.
5. Nothing is written: after any amount of editing, `git status` shows no rebase
   in progress and `ORIG_HEAD` is unchanged.
6. The screen refuses to plan a rebase of a branch with no merge base against
   the chosen upstream, and says why.
7. The Apply button is visibly disabled with its reason.

## Dependencies

FEAT-001 (`graph::walk` for the commit range), FEAT-004 (choosing an upstream).
