<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-034 — Plan

**Item:** [`agile/items/FEAT-034-stash-entry-file-browsing.md`](../items/FEAT-034-stash-entry-file-browsing.md)
**Branch:** `feature/FEAT-034-stash-file-browsing`
**Status:** implemented.

**Branch point.** Cut from `task/TASK-003-runtime-generic`, continuing the
unmerged stack.

## Approach

### The item's own criterion decided the shape

*"FEAT-002's diff rendering, which this reuses rather than re-implements."* Both
of the Diff screen's components read the `diff` store directly, so reuse was not
possible without changing them first. They now take what they render:

- `FileList` takes `files`, `selected`, `onselect`, and optionally `onstep`,
  `label` and `empty`.
- `DiffPane` takes `file`, `path`, `error`, `loading`, `view` and `focus`.

The Diff screen passes its store's values; the Stash screen passes its own. One
renderer, two callers, and no second diff view to keep in step with the first.
The alternative — a `StashPane` that drew hunks itself — is a copy of six
rendering states (binary, too large, mode-only, error, unselected, loading) that
would each have to be discovered twice.

### The read was already there

`commitDiff` on the entry's id gave the file list before this item, and
`fileDiff` on the same id gives one file's hunks. Both are existing commands
with existing tests; the item's "any new backend read" non-scope holds. A stash
*is* a commit, so this is presentation over a read that exists, exactly as the
item says.

The per-file cache is the Diff screen's, for the same reason: walking back and
forth through an entry's files costs one fetch each rather than one per view.

### What the panel keeps, and what left it

The detail panel already listed the entry's files as inert rows. Those became a
column of their own, beside the pane showing one of them. What stays in the
panel is everything about the entry that is *not* a file: which stash it is, who
made it, what it was made on, the totals, where in the files you are, and the
pop / apply / drop chips FEAT-014 built.

### The open file survives a re-read

`select(id, force)` is called with `force` after an apply and after the watcher
reports a change. Forgetting the open file there would snap the reader back to
the first file every time the screen refreshed. It is kept when the same path is
still in the entry, and the first file is opened when it is not.

It is *not* kept across a change of entry, and neither is the hunk cache: those
hunks belong to one entry, and the same path in another entry is a different
file.

### Keyboard

`↑` / `↓` walk the files, `Home` / `End` reach the ends. On the list rather than
the window, because a file list is one of several things on screen that could
answer to an arrow key and the one with focus is the one that should. `j` / `k`
jump between hunks on the window, matching 1B, and step aside for the message
field along the bottom of this screen.

The Diff screen gets the arrow keys too. It had Prev/Next buttons and no key,
and "matching the Diff screen" is only true if both ends match.

### Layout

Four columns: entries, files, diff, detail. The entries list became a fixed
column — `--stash-entries-w`, a new panel at 280px — because two flexible
columns beside each other leave the divider between them with nothing to mean.
The file column reuses `--diff-files-w` rather than adding a key: it is the same
thing at the same size, and a reader who widens one has said what they want of
the other.

### One setting, not two

Unified/split is `diff.setView`, shared with the Diff screen. It is a preference
about reading diffs, not about a screen, and two toggles that could disagree
would be a bug waiting to be reported.

## What was not done

- **Staging, discarding or editing from the pane.** The item's non-scope, and
  FEAT-014 owns restoring an entry.
- **The conflicted-apply path.** Still FEAT-016's ground.
- **Per-file restore** — applying one file out of a stash. Not in the item, and
  `git` has no single command for it.
