<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-008 — Automated tests

## Run result

```
cargo test --workspace     184 passed, 0 failed   (165 core, 19 tauri)
npm test                   476 passed, 0 failed   (29 files)
npm run check              921 files, 0 errors
cargo fmt --all --check    clean
cargo clippy --workspace --all-targets -- -D warnings   clean
```

## Coverage against the Amendment 10 floor of 70%

| Tree | Statements / Regions | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Frontend (`src/lib/**`) | 97.32% | 86.38% | 94.47% | 97.85% |
| `src/lib/conflicts/**` | 97.19% | 87.95% | 92.00% | 97.67% |
| Rust workspace | 88.20% | — | 76.99% | 86.41% |
| `crates/spagitty-core/src/conflicts.rs` | 94.42% | — | 90.00% | 95.30% |

## Rust — `conflicts.rs`, 18 tests

| Test | Asserts |
| --- | --- |
| `the_conflicted_paths_match_what_git_reports` | The list is `git diff --name-only --diff-filter=U`, in the same order — acceptance criterion 1 |
| `the_status_walk_finds_the_same_paths_by_a_different_route` | `status::working_copy` finds the same paths by walking the working copy while this module reads the index. Two routes to one answer, which is worth more than one route used twice |
| `each_side_is_what_git_show_reports_for_that_stage` | Base, ours and theirs each compared against `git show :1:`, `:2:` and `:3:` — criterion 3 |
| `the_merged_side_is_the_file_on_disk_with_its_markers` | The merged pane is the working-tree file, markers included, byte for byte |
| `a_file_added_on_both_sides_has_no_base_and_says_so` | No stage 1 is `BothAdded` with a null base rather than a failure — criterion 4 |
| `a_delete_modify_conflict_names_the_side_that_deleted_it` | A missing stage 3 is `DeletedByThem`, with base and ours present — criterion 5 |
| `a_binary_side_is_named_rather_than_decoded` | Binary is flagged, the text is empty, and the size is still reported |
| `a_clean_repository_has_no_conflicts_and_no_operation` | Criterion 7's data half |
| `the_operation_is_read_from_the_repository_rather_than_guessed` | A merge reads as a merge and a stopped cherry-pick reads as a cherry-pick, from two fixtures with identical conflicted indexes — criterion 6. The index cannot tell them apart; `.git` can |
| `asking_about_a_path_that_is_not_conflicted_is_an_error` | Being asked about an unconflicted or unknown path means the screen and the repository have drifted apart, and saying so beats returning three empty sides |
| `an_empty_repository_has_no_conflicts_rather_than_a_failure` | A repository with no index at all |
| `reading_every_side_never_writes_to_the_repository` | The index's mtime either side of visiting every conflicted file, and no `index.lock` afterwards — criterion 8. Both readings are taken with nothing in between, because a status walk rewrites the index to cache stat information |
| `the_state_carries_the_operation_and_the_files_together` | One call fills the screen's header and its pager |
| `an_operation_names_itself_the_way_git_does` | |
| `a_line_count_treats_a_trailing_newline_as_ending_the_last_line` | |
| `a_nul_byte_after_the_sniff_window_is_still_text` | Git's own `FIRST_FEW_BYTES` rule, so Spagitty calls the same files binary that `git diff` does |
| `a_side_over_the_ceiling_is_reported_rather_than_sent_to_the_screen` | Three panes render at once; a 9MB side is named, not drawn |
| `stages_map_to_the_kind_of_conflict_they_describe` | The whole stage-to-kind table, including the case that is not a conflict anyone can act on |

Four new fixtures back these: `added_on_both_sides`, `deleted_on_one_side`,
`binary_conflict` and `cherry_pick_conflict`. Each is built with the `git`
binary and asserts that the merge it runs actually stopped — a fixture that
merged cleanly would produce tests that pass by testing nothing.

## Frontend

| File | What the tests assert |
| --- | --- |
| `conflicts/store.test.ts` (19) | The operation and files arrive as the repository reported them; the first conflicted file opens without being asked, because a screen listing three conflicts and showing none makes the user click before it has said anything; a failed read shows nothing; a superseded list read is dropped, and so is a superseded read of one file over another; the operation is labelled by the name the user would type; conflicts with nothing in progress report `none` rather than the likeliest guess; selecting reads that file's sides; re-selecting the open file does not re-read it; a failed side read leaves the list intact; the pager steps without wrapping at either end; the open file survives a reload when it is still conflicted and falls back to the first when it was resolved elsewhere; a repository with nothing conflicted holds no selection; a missing side stays null rather than becoming an empty one; clearing forgets everything |
| `conflicts/panes.test.ts` (13) | A side renders line by line with its count; conflict markers are marked, so the merged pane reads as the thing being worked on; a missing side says it was deleted rather than drawing empty; no common ancestor says both sides added the file; a binary side names its size instead of decoding; a side over the ceiling says so; an empty side is distinguished from a missing one; a merged pane with no file on disk says so in its own words; the pager draws one chip per file named by its file name, carries the full path and the kind in each title, marks the open one and opens another on click, says where in the list the open file sits, and disables Previous and Next at the ends |

## Not covered by automated tests

- **The rail's Conflicts count becoming real** (criterion 2) is already wired
  through `status::counts`, which has its own tests; that it renders as a
  number rather than `·` with a conflicted repository open is SWEEP-1D-02.
- **Nothing written, observed from outside** (criterion 8) is proved in Rust
  against a fixture. That the same holds for a real repository visited through
  the UI is SWEEP-1D-09, which checks `git status` and the index by hand.
- `src/routes/conflicts/+page.svelte` is outside the coverage scope, like every
  screen shell.
