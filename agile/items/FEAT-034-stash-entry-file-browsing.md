<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-034 — Browse a stash entry file by file

**Status:** Done. Plan: [`agile/plans/FEAT-034-plan.md`](../plans/FEAT-034-plan.md).
**Screen:** Stash (1G).
**Recorded by:** TASK-012, which found this identifier cited by FEAT-014 and
`docs/screens.md` with no document behind it.

## Problem

The Stash screen's detail panel shows what is in the selected entry as one
diff. There is no way to walk it a file at a time — no file list, no pane
selection, none of the per-file navigation the Diff screen (1B) has.

By the time this was picked up the panel had grown a list of file *names*, added
in passing with the rest of the panel. It was inert: no selection, no counts, no
diff behind it. The gap the item describes was the same gap.

An entry with two files is fine as one scroll. An entry holding a day's work is
not, and a stash is exactly where a day's work goes.

## Scope

- A file list for the selected entry, and a pane showing the selected file's
  diff.
- The same reading as everywhere else: a stash **is** a commit whose first
  parent is the commit the work was made on, so `commit_diff` on the entry's id
  already returns per-file diffs. This is presentation over a read that exists.
- Keyboard movement through the files, matching the Diff screen.

## Non-scope

- Staging, discarding or editing anything from the stash pane. Restoring an
  entry is FEAT-014 and is built.
- The conflicted-apply path. That needs a conflict write path and belongs with
  FEAT-016.
- Any new backend read.

## Acceptance

- Selecting an entry lists its files; selecting a file shows that file's diff.
- An entry with one file looks no worse than it does today.
- Nothing here talks to the network or writes to the working copy.

## Dependencies

FEAT-005, which built the screen. FEAT-002's diff rendering, which this reuses
rather than re-implements.

## How it was closed

The reuse criterion decided the shape. `FileList` and `DiffPane` read the `diff`
store directly, so reuse meant changing them first: both now take what they
render as props, the Diff screen passes its store's values and the Stash screen
passes its own. One renderer, two callers, and none of `DiffPane`'s six states —
binary, too large, mode-only, error, unselected, loading — discovered twice.

The screen is four columns: entries, files, diff, and a detail panel holding
everything about the entry that is not a file. `↑` / `↓` walk the files and
`j` / `k` jump between hunks, which the Diff screen now does too — "matching the
Diff screen" is only true if both ends match.
