<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-034 — Automated tests

**Item:** [`agile/items/FEAT-034-stash-entry-file-browsing.md`](../items/FEAT-034-stash-entry-file-browsing.md)
**Plan:** [`agile/plans/FEAT-034-plan.md`](../plans/FEAT-034-plan.md)

No Rust was written. `commit_diff` and `file_diff` are the reads, both already
covered by `crates/spagitty-core/src/diff.rs`'s own tests — the item's "any new
backend read" non-scope held.

## What was written

| Test | Layer | What it asserts |
| --- | --- | --- |
| `opens an entry on its first file rather than on an empty pane` | `src/lib/stash/store.test.ts` | The click the screen can make for you, and that it reaches `fileDiff` with the entry's id. |
| `reads a file against the entry it belongs to` | `src/lib/stash/store.test.ts` | The id passed is the stash's, not HEAD's. A stash is a commit and is read as one. |
| `says where in the entry the open file is` | `src/lib/stash/store.test.ts` | `fileIndex` and `fileCount`, which the panel says out loud. |
| `walks the files and stops at either end` | `src/lib/stash/store.test.ts` | Forward, back, and **clamped at both ends** — past the start is the start, not a wrap and not an error. |
| `re-reads nothing when a file is opened twice` | `src/lib/stash/store.test.ts` | The cache. Walking back and forth costs one fetch per file, not one per view. |
| `throws the cache away when a different entry is opened` | `src/lib/stash/store.test.ts` | The same path in another entry is a different file, and is read again. |
| `keeps the open file when the same entry is read again` | `src/lib/stash/store.test.ts` | A re-read after an apply or a `repo-changed` does not lose the reader's place. |
| `opens the first file when the one that was open is gone` | `src/lib/stash/store.test.ts` | And the other half of it: a path that no longer exists is not held on to. |
| `selects nothing at all for an entry that changed nothing` | `src/lib/stash/store.test.ts` | No path, no fetch, and `stepFile` through nothing is a no-op rather than a crash. |
| `surfaces a failed file read without losing the file list` | `src/lib/stash/store.test.ts` | One file failing is one pane failing; the list stays. |
| `ignores a slow read that lost the race to a newer one` | `src/lib/stash/store.test.ts` | The sequence guard. Clicking two files quickly must not leave the first one's hunks under the second one's name. |
| `forgets the open file when the screen is cleared` | `src/lib/stash/store.test.ts` | Switching repository leaves nothing of the last one behind. |
| `does nothing when a file is selected with no entry open` | `src/lib/stash/store.test.ts` | No entry, no read. |
| `lists the files it is given with their line counts` | `src/lib/diff/panes.test.ts` | `FileList` renders from props now, which is what let the Stash screen use it. |
| `reports the path when a row is clicked` / `marks the selected row and only that one` | `src/lib/diff/panes.test.ts` | The component's whole contract: it reports, the caller decides. |
| `walks the list with the arrow keys, and reaches its ends` | `src/lib/diff/panes.test.ts` | `↑`, `↓`, `Home`, `End` reach `onstep`. Clamping is the store's, and is tested there. |
| `leaves the arrow keys alone when it was given no way to step` | `src/lib/diff/panes.test.ts` | Without `onstep` the list is click-only and the key belongs to whatever else wants it. |
| `says so when there are no files, in the words it was given` | `src/lib/diff/panes.test.ts` | Both empty states — "No file changes." on a commit, "This entry changed nothing." on a stash. |
| Every `DiffPane` case (unified, split, uneven pairing, binary, too large, mode-only, error, unselected, focused hunk) | `src/lib/diff/panes.test.ts` | Unchanged in what they assert, rewritten to pass props. These are the six states a second stash renderer would have had to grow independently. |
| `shows the entry, who stashed it, and what is in it` | `src/lib/stash/panes.test.ts` | Extended: the panel now says `file 1 of 1` as well as the totals. |
| `counts an entry that changed nothing as no files` | `src/lib/stash/panes.test.ts` | Replaces the old assertion about the sentence, which moved to the file column's empty state. |
| `returns to the design widths and stores that` | `src/lib/panels.test.ts` | Extended: `stashEntries` round-trips through the same record as the other panels. |

## What is not covered

- **The route.** `src/routes/stash/+page.svelte` is read rather than mounted, as
  everywhere else in this suite. The four-column layout, the shared
  unified/split chips and `j` / `k` on this screen are SWEEP-034-02, -05 and -06.
- **A stash entry holding a binary or over-large file.** `DiffPane` says so and
  is tested for it; that the *stash* path reaches the same rendering is the same
  component and the same props.
- **The splitters.** `Splitter` and `panels` are FEAT-037's, tested there. What
  is new here is one more key in the record, which is covered.
