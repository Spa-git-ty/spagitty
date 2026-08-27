<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-048 — Automated tests

**Item:** [`agile/items/FEAT-048-discard-changes.md`](../items/FEAT-048-discard-changes.md)
**Plan:** [`agile/plans/FEAT-048-plan.md`](../plans/FEAT-048-plan.md)

## What was written

| Test | Layer | What it asserts |
| --- | --- | --- |
| `discarding_a_path_puts_the_file_back_the_way_the_index_has_it` | `crates/spagitty-core/src/work.rs` | The file on disk matches what it was, and the unstaged list is empty. |
| `discarding_keeps_what_was_already_staged` | `crates/spagitty-core/src/work.rs` | The single most important assertion here: a file staged and then changed again keeps its staged content and loses only the rest. This is what `--staged` being absent buys. |
| `discarding_an_untracked_file_deletes_it` | `crates/spagitty-core/src/work.rs` | There is no earlier version, so removal is the only meaning discard can have. The file is gone from disk, not just from the list. |
| `discarding_a_deletion_brings_the_file_back` | `crates/spagitty-core/src/work.rs` | Discard restores a deleted file rather than confirming the deletion. |
| `discarding_a_mixed_selection_handles_each_path_by_what_it_is` | `crates/spagitty-core/src/work.rs` | One call with a tracked and an untracked path does the right thing to each — the classification is read from the status, not from the caller. |
| `discarding_never_touches_an_ignored_file` | `crates/spagitty-core/src/work.rs` | An ignored file beside a discarded one survives. `git clean` without `-x`, asserted rather than assumed. |
| `discarding_nothing_is_not_an_error_and_does_nothing` | `crates/spagitty-core/src/work.rs` | An empty path list is a no-op, not a `git` invocation with no pathspec — which would discard everything. |
| `discarding_one_hunk_discards_only_that_hunk` | `crates/spagitty-core/src/work.rs` | The first hunk is reverted and the second is still there. |
| `discarding_a_hunk_never_touches_the_index` | `crates/spagitty-core/src/work.rs` | `ls-files --stage` is byte-identical afterwards. The mirror of the staging test that keeps `--cached` off the working tree. |
| `a_hunk_that_has_moved_is_refused_rather_than_discarded_from_a_stale_view` | `crates/spagitty-core/src/work.rs` | `Error::Stale`, not a patch applied to a file that has changed underneath the screen. |
| `throws away the paths it is given and re-reads afterwards` | `src/lib/changes/store.test.ts` | The call reaches the API and a fresh status walk and repository refresh follow it, the same as staging. |
| `asks nothing itself — the confirmation is the caller’s` | `src/lib/changes/store.test.ts` | The store is drivable without a dialog. Where the question lives is a design decision, so it is pinned. |
| `surfaces a refusal rather than pretending it worked` | `src/lib/changes/store.test.ts` | A rejected write returns false and leaves its message in `writeError`. |
| `discards a hunk of the open unstaged file` | `src/lib/changes/store.test.ts` | The open selection supplies the path; the caller supplies index and header. |
| `refuses to discard a hunk from the staged side` | `src/lib/changes/store.test.ts` | Returns false and calls nothing. Belt to the component's braces. |
| `does nothing with no file open` | `src/lib/changes/store.test.ts` | No selection, no call. |
| `says the file goes back to what is staged, for a tracked one` | `src/lib/changes/discard.test.ts` | The exact sentence, because the sentence is the safety mechanism. |
| `says an untracked file is deleted, because that is what happens` | `src/lib/changes/discard.test.ts` | The distinction the module exists for: one word, two events, and the dialog says which. |
| `says both when the selection is a mix` / `counts rather than listing when there are several` | `src/lib/changes/discard.test.ts` | Both halves appear, and a long selection is counted rather than listed into an unreadable paragraph. |
| `always says it cannot be undone` | `src/lib/changes/discard.test.ts` | Every shape of the body carries the warning. There is no reflog for the working tree. |
| `asks before anything is thrown away` | `src/lib/changes/discard.test.ts` | The question is on screen and the store has been called *zero* times at that point — the gate, asserted at the moment it matters. |
| `does nothing at all when the question is dismissed` | `src/lib/changes/discard.test.ts` | Dismissal reaches nothing. |
| `names how many files are at stake in the title` | `src/lib/changes/discard.test.ts` | "Discard changes to 2 files" before the body explains what that means. |
| `asks nothing when there is nothing to discard` | `src/lib/changes/discard.test.ts` | An empty selection opens no dialog, so Discard all on a clean tree is inert rather than a question about nothing. |
| `is every unstaged row, and only those` | `src/lib/changes/discard.test.ts` | Discard all reaches exactly the unstaged column. |
| `asks, names the file, and says the rest of it is left alone` | `src/lib/changes/discard.test.ts` | The hunk question names the file and scopes itself. |
| `offers discard on unstaged rows and on no staged row` | `src/lib/changes/panes.test.ts` | Where the control is, which is as much of the design as what it does. |
| `says an untracked row will be deleted rather than reverted` / `warns on a tracked row that the change cannot come back` | `src/lib/changes/panes.test.ts` | The per-row titles, both exact. |
| `offers Discard all beside Stage all, and neither with nothing unstaged` | `src/lib/changes/panes.test.ts` | The header control appears with work to discard and not without. |
| `offers to discard a hunk on the unstaged side only` | `src/lib/changes/panes.test.ts` | The chip is absent on the staged side. |
| `paints the discard chip as the destructive one` | `src/lib/changes/panes.test.ts` | `danger` on the second chip and not the first. |

## What is not covered

- **The confirmation dialog's own rendering.** `Dialog.svelte` is tested by
  FEAT-011's suite; these tests drive `dialog.accept()` and `dialog.dismiss()`
  rather than clicking through it.
- **`git clean` on an untracked directory.** `-d` is passed and reasoned about,
  but the fixture's untracked entries are files. SWEEP-048-06 covers it.
- **A file that cannot be written** — read-only, or removed by another process
  between the status walk and the restore. The error path is generic and is
  covered as a shape (`surfaces a refusal`), not as a specific failure.
