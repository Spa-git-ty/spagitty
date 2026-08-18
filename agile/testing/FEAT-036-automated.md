<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-036 — Automated tests

**Item:** [`agile/items/FEAT-036-one-chip-per-branch.md`](../items/FEAT-036-one-chip-per-branch.md)
**Files:** `crates/gitlumiere-core/src/refs.rs` (the `tests` module) and
`src/lib/ui/ui.test.ts`.

*Backfilled by TASK-013. Every test named here exists and passes; the table says
what each one holds in place.*

## Rust — the merge

The merge is a backend decision, and the fixture there builds real repositories,
so this is where the cases live.

| Test | Holds in place |
| --- | --- |
| `a_local_branch_and_its_remote_at_the_same_commit_are_one_chip` | the feature |
| `a_remote_that_has_fallen_behind_stays_its_own_chip` | that divergence needs no special case — it falls out of grouping by commit, and nobody may add one later |
| `a_branch_on_two_remotes_carries_both` | one chip, two host marks |
| `a_slashed_branch_name_splits_at_the_remote` | `origin/feature/x` is `feature/x` on `origin`, splitting at the **first** slash |
| `a_tag_never_merges_with_a_branch_of_the_same_name` | that the merge key is not just the name |
| `a_host_is_read_from_a_url_in_any_form_git_accepts` | `https://`, `ssh://`, and the scp-like `git@host:path` |
| `a_host_is_not_guessed_from_a_path_segment` | `https://git.example.com/mirrors/github.com/o/r.git` is **not** GitHub — the defect the first implementation had |
| `every_kind_of_ref_is_counted_once` | counts stay per ref, so merging chips does not halve the rail's numbers |
| `the_current_branch_sorts_ahead_of_everything_else_on_its_commit` | the rewritten ordering |
| `branches_sort_ahead_of_tags_on_the_same_commit` | the rest of the rewritten ordering |

Also passing through unchanged from before the item, and re-run because the
ordering and shape moved: `names_are_shortened_for_display`,
`an_annotated_tag_lands_on_its_commit_rather_than_on_the_tag_object`,
`a_lightweight_tag_lands_on_its_commit_too`, `a_detached_head_has_no_current_branch`,
`refs_that_are_not_history_labels_are_ignored`, `a_commit_with_no_refs_has_no_chips`,
`an_empty_repository_has_no_refs_and_is_not_an_error`.

## Frontend — the drawing and the words

`src/lib/ui/ui.test.ts`, the `RefChip — local and remote marks` block:

| Test | Holds in place |
| --- | --- |
| `shows one mark for a branch that is only on this machine` | the computer glyph |
| `shows two marks for a branch that is here and on a remote` | both, on one chip |
| `shows one mark for a branch that is only on a remote` | the host glyph alone |
| `shows a mark per remote when a branch is on more than one` | one mark per remote |
| `gives a tag no marks at all` | tags are untouched |
| `says in words what the glyphs say in pictures` | the title — `main — on this machine, on origin (GitHub)` |
| `names an unrecognised host as a remote rather than guessing` | the generic cloud |
| `hides the marks from assistive technology, since the title carries them` | the chip is not icon-only to a screen reader |
| `still carries the full name for a tag, which has nowhere else to say it` | the title for the one case with no marks |

The older `RefChip` block still asserts the check on the current branch, the tag
treatment, and a remote-only branch.

## Coverage at the time

1034 frontend tests and 280 Rust tests passing; branches 72.42%, all four
metrics over the Amendment 10 floor.

## Not covered here

- That the glyphs are legible at the smallest type scale, and that two identical
  GitHub marks on one chip are or are not confusing. The item leaves that open
  until the case is seen — `FEAT-036-T4` in the sweep.
- That the chip's colours hold in both themes — `FEAT-036-T5`.
