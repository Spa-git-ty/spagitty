<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-014 — Stash pop, apply and drop

**Status:** Backlog. No plan yet; one is written when the work starts.
**Screen:** Stash (1G).

## Problem

FEAT-005 shows stash entries and their diffs but cannot restore or remove one.
The three buttons render disabled.

## Why it was deferred

Popping writes to the working copy and can conflict; dropping destroys an entry
whose only other reference is a reflog that expires. Both need a designed
recovery story rather than a button.

## Scope when started

- **Apply** — restore an entry's changes and keep the entry.
- **Pop** — apply and then drop, only if the apply was clean.
- **Drop** — remove an entry, behind a confirmation that shows what is in it.
- Handling the conflicted apply: the entry must survive, and the user must be
  told the working copy now has conflicts.

## Notes for whoever picks this up

- `git stash pop` on a conflict leaves the entry in place *and* the working copy
  conflicted. That state has to be explained, not swallowed.
- A dropped stash's commit is recoverable from the reflog until it expires; the
  confirmation should say so with the actual SHA.
- Applying onto a dirty working copy can fail halfway. Nothing should be
  attempted that cannot be described afterwards.

## Dependencies

FEAT-005, and FEAT-008 for the conflicted-apply path.
