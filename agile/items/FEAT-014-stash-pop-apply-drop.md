<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-014 — Stash pop, apply and drop

**Status:** Done, on `feature/FEAT-014-stash-pop-apply-drop`.
**Screen:** Stash (1G).

## Problem

FEAT-005 shows stash entries and their diffs but cannot restore or remove one.
The three chips render inert, beside a line telling the reader to go and run
`git stash pop` in a terminal instead.

**Corrected 2026-08-18.** The paragraph above said the backend did not exist.
It did, and had for some time:

| Piece | Where |
| --- | --- |
| `shell::stash_pop` / `stash_apply` / `stash_drop` | `crates/gitlumiere-core/src/shell.rs:695`, `:701`, `:711` |
| `commands::stash_action` | `src-tauri/src/commands.rs:510` |
| `api.stashAction` | `src/lib/api.ts:364` |
| `actions.stash` — **including the confirmation** | `src/lib/graph/actions.ts:363` |

Only the three `onclick` handlers were missing. What this item actually
delivered was that wiring, plus the one thing `actions` cannot know about — the
Stash screen holds its own copy of the list and had to re-read it.

## Why it was deferred

Popping writes to the working copy and can conflict; dropping destroys an entry
whose only other reference is a reflog that expires. Both need a designed
recovery story rather than a button.

That reasoning is why the confirmation lives in `actions.ts` rather than in the
component: the sentence shown before the operation is as much a part of it as
the command, and it is now written once for both the Stash screen and the
graph's own stash menu.

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

## What was delivered

- `stash.restore(action)` in `src/lib/stash/store.svelte.ts` — hands off to
  `actions.stash` for the confirmation and the write, then re-reads the list and
  the rail. Guards against a second click while one is in flight, so two clicks
  on Drop cannot drop two entries.
- `actions.stash` now answers **whether the repository changed**, so the screen
  re-reads exactly when there is something new to read rather than after every
  cancelled dialog. `perform` carries that answer; every other caller is a menu
  entry with no use for it and ignores it.
- The three chips are buttons, and the "not built yet" copy and the
  send-them-to-a-terminal line are gone.

## Still open, and deliberately not in this item

The conflicted-apply path from the notes below. `git stash pop` on a conflict
leaves the entry in place *and* the working copy conflicted; today that surfaces
as git's own message in a notice, which is honest but is not the designed
recovery story this item's own notes asked for. Resolving it properly needs
**FEAT-016** — there is no write path for conflicts yet — so it belongs with
that work rather than being half-built here.

Browsing an entry's files pane-by-pane is **FEAT-034**, which was always a
separate item.

## Dependencies

FEAT-005. FEAT-008 for the conflicted-apply path, which is not in this item —
see above.
