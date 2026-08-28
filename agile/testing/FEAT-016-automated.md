<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-016 — Automated tests

**Item:** [`agile/items/FEAT-016-conflict-resolution-writes.md`](../items/FEAT-016-conflict-resolution-writes.md)
**Plan:** [`agile/plans/FEAT-016-plan.md`](../plans/FEAT-016-plan.md)

## What was written

### Marker parsing — `crates/spagitty-core/src/conflicts.rs`

The heaviest block of assertions in the item, because this is the code that
decides which half of somebody's work is kept.

| Test | What it asserts |
| --- | --- |
| `a_file_with_no_markers_has_no_regions` | Ordinary text is not a conflict. |
| `a_region_carries_both_sides_without_its_markers` | Both sides come back, and the marker lines do not. |
| `a_region_knows_where_it_is_in_the_file` | 1-based, inclusive line numbers — the same numbering the merged pane shows. |
| `diff3_markers_give_the_base_as_well` | `\|\|\|\|\|\|\|` is read as the base rather than as content. |
| `several_regions_are_numbered_in_order` | Indexes ascend and do not overlap. |
| `an_empty_side_is_empty_rather_than_a_blank_line` | The difference between "contributed nothing" and "contributed a blank line". Getting this wrong inserts a line nobody wrote. |
| `an_unterminated_region_is_not_a_region` | A half-edited file is left alone rather than guessed at. |
| `a_region_with_no_separator_is_not_a_region` | Open and close with nothing between them is not a conflict. |
| `regions_before_a_broken_one_are_still_read` | Giving up is local: what parsed still parsed. |
| `taking_ours_keeps_our_lines_and_removes_every_marker` | The exact resulting text, not a substring. |
| `taking_theirs_keeps_theirs` | The mirror. |
| `a_region_that_is_not_there_is_refused_by_name` | An out-of-range index is an error naming the region, not a silent no-op. |
| `resolving_one_of_several_leaves_the_others_alone` | One region resolved, one still a region. |
| `resolving_all_of_them_leaves_no_markers_anywhere` | The exact whole-file result. Back-to-front application, asserted by the answer being right. |
| `resolving_all_of_a_file_with_no_conflicts_changes_nothing` | Byte-identical. |
| `a_side_that_deleted_the_lines_resolves_to_nothing_at_all` | An empty side removes the region rather than leaving a blank. |
| `the_base_is_dropped_along_with_the_markers` | `diff3` content does not survive into the result. |

### Writing, against real repositories — `crates/spagitty-core/src/conflicts.rs`

| Test | What it asserts |
| --- | --- |
| `taking_a_side_writes_the_working_file_and_leaves_the_index_conflicted` | The file changes and the path is *still conflicted*. The design decision that nothing resolves on the user's behalf, pinned. |
| `taking_theirs_takes_the_incoming_side` | The other direction. |
| `writing_the_merged_file_puts_exactly_what_it_was_given_on_disk` | Byte-for-byte, index untouched. |
| `marking_resolved_collapses_the_index_stages` | Three stages become none. The only real check that resolution worked. |
| `continuing_a_merge_once_everything_is_resolved_makes_the_commit` | No operation left, and the commit has two parents — the thing being attempted in the first place. |
| `continuing_with_a_file_still_conflicted_is_refused` | git says no and the merge is still in progress. |
| `aborting_a_merge_puts_the_file_and_the_repository_back` | The working file is ours again, nothing is conflicted, no operation. |
| `continuing_or_aborting_a_bisect_is_refused_rather_than_guessed` | `git bisect --abort` means something else, and is not reachable from here. |
| `an_interactive_rebase_continues_as_a_rebase` | The two rebase operations map to one command. |

### The store — `src/lib/conflicts/store.test.ts`

| Test | What it asserts |
| --- | --- |
| `takes the whole file and re-reads what that changed` | The call, and the reload after it. |
| `does nothing with no file open` / `surfaces a refusal rather than pretending it worked` | The two failure shapes. |
| `names the region by index and the side by name` / `resolves every region when the index is null` | Both forms reach the API unchanged. |
| `saves a dirty draft first, so the regions match the text on disk` | Asserted on **call order**: the write happens before the resolve. The indexes on screen belong to the text on screen. |
| `does not resolve at all when saving the draft failed` | A failed save stops the whole operation rather than resolving against stale text. |
| `starts from what is on disk and is not dirty until it changes` | Opening the editor is not an edit. |
| `is dirty once the text differs` | The flag every guard reads. |
| `writes exactly what was typed, and stops being a draft` | What is typed is what lands. |
| `keeps the draft when the write failed` | Losing an edit because the disk refused it is worse than the write failing. |
| `refuses to move to another file while it is dirty` | The silent discard the item named as the thing not to do. |
| `moves when the caller says the user has answered` | `force` is the only way past. |
| `survives a plain reload of the file it belongs to` | Refresh is not a way to lose an edit. |
| `is dropped by taking a side, which replaces the file anyway` | No stale draft over a file that has been rewritten. |
| `marks the open file resolved` | `git add` with the open path. |
| `knows when everything is resolved and something is still in progress` / `is not "all resolved" when nothing was in progress` | The condition Continue is offered on. |
| `continues and aborts, re-reading afterwards either way` | Both re-read. |
| `surfaces git’s refusal to continue` | git's own words reach the screen. |

### The questions — `src/lib/conflicts/actions.test.ts`

| Test | What it asserts |
| --- | --- |
| `says a merge touches nothing already committed` | The merge wording. |
| `names ORIG_HEAD for a rebase, and warns about the resolutions` | Both halves of the rebase answer. |
| `says an interactive rebase the same way as a plain one` | One sentence, two operations. |
| `is honest that a cherry-pick keeps the commits it already made` | The one people get wrong. |
| `says the same of a revert` | The same shape. |
| `asks first, and is painted as destructive` | Dialog open, store called zero times. |
| `names an interactive rebase properly in the title` | Not `rebaseInteractive` in front of a person. |
| `does nothing when dismissed` / `asks nothing when there is no operation to abort` | Neither reaches git. |
| `goes straight through when there is nothing unsaved` | No dialog when there is nothing to lose. |
| `asks, and keeps the edit when the answer is no` | The edit survives a refusal. |
| `throws the edit away only when the answer is yes` | And only then. |
| `stops a move to another file` / `stops a step through the pager` | Both routes off a file are guarded. |
| `lets the move through once the edit is dealt with` | Forced, because the store refuses otherwise. |

### The components — `src/lib/conflicts/panes.test.ts`

| Test | What it asserts |
| --- | --- |
| `is text until Edit, and a textarea after it` | The pane changes shape, and the textarea's value is the draft. |
| `never turns another side into an editor` | Ours and theirs stay read-only while an edit is under way. |
| `offers a whole-file side, an edit and a mark-resolved` | The four file-level controls. |
| `counts the conflicts in the file and offers one row for each` | The count, the 1-based label, and the line range. |
| `resolves the region the button belongs to` | Index 0 and the right side reach the store. |
| `takes a whole side without touching the regions` | The file-level path. |
| `offers an all-of-them shortcut only when there is more than one` | One conflict needs no "all". |
| `swaps Edit for Save and discard once an edit is under way` | The bar has two states. |
| `says so when a file has no markers left to point at` | And keeps the whole-file controls, because a delete/modify conflict has no markers and still has to be resolved. |

## What is not covered

- **The route.** `src/routes/conflicts/+page.svelte` is read rather than
  mounted, as everywhere else in this suite. Continue's visibility rule and the
  all-resolved empty state are SWEEP-016-07 and -08.
- **A conflict during a rebase, end to end.** The core covers a merge; the
  rebase hand-off is FEAT-015's SWEEP-015-04 and this item's SWEEP-016-06.
- **Concurrent edits from outside.** A file changed on disk while a draft is
  open is not detected — the draft simply wins when it is saved. Called out in
  SWEEP-016-09 rather than pretended otherwise.
