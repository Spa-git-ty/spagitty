<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-003 — Automated tests

## Run result

```
cargo test --workspace     120 passed, 0 failed   (109 core, 11 tauri)
npm test                   360 passed, 0 failed   (21 files)
npm run check              903 files, 0 errors
cargo fmt --all --check    clean
cargo clippy --workspace --all-targets -- -D warnings   clean
```

## Coverage against the Amendment 10 floor of 70%

| Tree | Statements / Regions | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Frontend (`src/lib/**`) | 97.68% | 87.08% | 96.27% | 98.40% |
| Rust workspace | 86.16% | — | 73.98% | 84.01% |

## Rust — reading the working copy

`crates/gitlumiere-core/src/status.rs`, 14 tests.

| Test | Asserts |
| --- | --- |
| `a_clean_working_copy_has_nothing_in_any_list` | All three lists empty, and no phantom entries from the stash the fixture carries |
| `staged_unstaged_and_untracked_land_in_the_right_lists` | Each of the three kinds in its own list, with the right status |
| `the_lists_match_git_status` | The distinct-path count equals `git status --porcelain | wc -l` for the same repository |
| `a_path_staged_and_then_changed_again_appears_in_both_lists` | The case the three-list model exists for, and that it still counts as one changed path |
| `a_staged_addition_reads_as_added` | An addition is not reported as a modification |
| `a_staged_deletion_reads_as_deleted` | Likewise for a deletion |
| `a_file_deleted_but_not_staged_reads_as_an_unstaged_deletion` | Deleting without staging is an unstaged change, not a staged one |
| `untracked_files_are_listed_individually_rather_than_as_their_directory` | Collapsed into a directory, the screen could not offer to stage one |
| `ignored_files_are_not_listed` | `.gitignore` is honoured |
| `a_conflicted_path_is_neither_staged_nor_unstaged` | A conflict is its own state, not an unstaged change |
| `entries_are_sorted_by_path` | Stable order, so rows do not jump between reloads |
| `the_rail_counts_come_from_the_walk` | `staged`, `working` and `conflicts` all match the walk, and `working` matches git |
| `the_commit_count_is_still_the_walks_to_report` | The working figures became real; the commit count cannot, because only the walk knows it |
| `a_bare_repository_reports_no_working_copy_rather_than_an_empty_one` | `None`, not `0` — a bare repository has no working copy to be empty |

## Rust — changing the working copy

`crates/gitlumiere-core/src/work.rs`, 22 tests. Ordered here by what they protect.

**Nothing is lost.**

| Test | Asserts |
| --- | --- |
| `stage_then_unstage_leaves_the_index_byte_for_byte_as_it_was` | `git ls-files --stage` is identical before and after the round trip |
| `unstaging_never_touches_the_working_tree` | The file on disk is unchanged, byte for byte |
| `staging_a_hunk_never_touches_the_file_on_disk` | Staging part of a file must not lose the rest — the reason `--cached` is used |
| `staging_a_hunk_and_unstaging_it_again_is_a_round_trip` | The index returns to exactly its previous state |
| `a_file_without_a_trailing_newline_does_not_gain_one` | The staged blob still ends without a terminator; a patch that added one would be a content change nobody asked for |
| `a_hunk_that_has_moved_is_refused_rather_than_half_applied` | `Stale`, not a wrong result, when the file changed under the screen |
| `a_hunk_index_past_the_end_is_refused` | Likewise for an index that no longer exists |

**Staging does what it says.**

| Test | Asserts |
| --- | --- |
| `staging_a_path_moves_it_from_unstaged_to_staged` | The obvious case |
| `staging_is_visible_to_git_immediately` | `git status --porcelain` in a terminal agrees |
| `staging_an_untracked_file_adds_it` | One command covers add, modify and delete |
| `staging_a_deletion_stages_the_deletion` | |
| `staging_one_hunk_stages_only_that_hunk` | The other hunk is still unstaged, with the right content on each side |
| `a_partly_staged_file_appears_in_both_lists` | The three-list model, from the write side |
| `unstaging_in_a_repository_with_no_commits_removes_the_entry` | No `HEAD` to restore from; the file stays on disk |
| `staging_nothing_is_not_an_error_and_does_nothing` | An empty selection is a no-op, not a failure |
| `a_path_that_looks_like_an_option_is_still_a_path` | `--` before the paths |
| `a_binary_file_has_no_hunks_to_stage` | `NotStageable`, with a sentence |
| `a_bare_repository_has_no_working_copy_to_change` | |

**Committing.**

| Test | Asserts |
| --- | --- |
| `committing_writes_what_is_staged_and_nothing_else` | The commit touches exactly the staged path; the unstaged one survives |
| `a_subject_and_a_body_become_a_message_with_a_blank_line_between` | The conventional message shape |
| `an_empty_subject_is_refused_before_anything_runs` | `HEAD` is unchanged — the check happens before `git` is spawned |
| `committing_nothing_is_refused_by_git_and_leaves_head_alone` | git's own refusal, surfaced |
| `a_failing_pre_commit_hook_stops_the_commit_and_says_why` | The hook runs, its stderr reaches the error, and `HEAD` does not move — the reason committing goes through `git` |
| `amending_replaces_the_previous_commit_rather_than_adding_one` | The commit count is unchanged and the subject is the new one |
| `the_head_message_is_offered_for_an_amend` / `an_unborn_head_offers_no_message_to_amend` | |

## Rust — diffing the working copy

Added to `crates/gitlumiere-core/src/diff.rs`'s existing suite: `working_file_diff`
on both sides, exercised through the `work.rs` tests above, plus the patch
builder's `\ No newline at end of file` behaviour.

## Frontend

| File | Unit | What the tests assert |
| --- | --- | --- |
| `changes/store.test.ts` (35) | `store.svelte.ts` | The walk fills three lists and opens the first unstaged file, falling back to a staged one and to nothing when clean; the selection survives a reload when its row does and moves when it does not; the same path on the other side is a different thing to read; superseded walks and file loads are dropped; a write re-reads rather than patching the lists, and refreshes the rail; a second write is refused while one is in flight; the hunk button stages or unstages according to which side is open; committing needs a subject, needs something staged, refuses while anything is conflicted, and is allowed for an amend with nothing staged; a failed commit keeps the message; amend offers the previous message but never overwrites one being written |
| `changes/panes.test.ts` (23) | `FileColumn`, `HunkPane`, `MessageBox` | Solid staged rows against dashed unstaged ones; a path in both lists when staged in part, and only the open side marked; the untracked glyph; staging one file and staging all; opening a row on its own side; conflicts explained with no action offered; empty sections that say so; every action disabled while a write is in flight; the hunk pane's chip says `stage hunk` or `unstage hunk` by side; binary, too-large and mode-only are three different sentences; the message box writes through to the store, counts only a long subject, and says what amending does |

## Known gaps

- The screen component itself (`src/routes/changes/+page.svelte`) is not
  covered: `src/routes/**` is outside the coverage scope by design — it holds
  the screens' shells, and the logic lives in `src/lib`.
- The Tauri command layer is still untested (TASK-003).
- Rename detection in the status walk is reported as `renamed` but has no test
  of its own; the fixtures do not produce one reliably.
