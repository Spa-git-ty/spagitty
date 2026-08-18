<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-006 — Automated tests

## Run result

```
cargo test --workspace     166 passed, 0 failed   (147 core, 19 tauri)
npm test                   444 passed, 0 failed   (27 files)
npm run check              916 files, 0 errors
cargo fmt --all --check    clean
cargo clippy --workspace --all-targets -- -D warnings   clean
```

## Coverage against the Amendment 10 floor of 70%

| Tree | Statements / Regions | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Frontend (`src/lib/**`) | 97.42% | 86.20% | 95.04% | 98.00% |
| `src/lib/repos/**` | 97.38% | 83.07% | 97.36% | 99.00% |
| Rust workspace | 87.55% | — | 76.43% | 85.51% |
| `crates/gitlumiere-core/src/repo.rs` | 97.35% | — | 92.11% | 96.04% |
| `src-tauri/src/recents.rs` | 72.78% | — | 71.43% | 65.85% |

`recents.rs` is the lowest figure in the change and the reason is worth writing
down. The module was first written as three functions that each took an
`AppHandle`, which put the list logic — dedupe, promote, cap — behind a running
Tauri application and made it untestable headlessly; it measured 0%. The logic
was extracted into `parse`, `promoted` and `without`, which take and return
plain values and are what the tests below exercise. What remains uncovered is
the `AppHandle` I/O around them: resolving the config directory, reading the
file, writing it. That is a design fact rather than a gap the tests can close,
and the manual sweep covers it instead (SWEEP-1J-08, SWEEP-1J-09).

## Rust — `repo.rs`, 6 new tests

| Test | Asserts |
| --- | --- |
| `a_summary_describes_a_repository_without_opening_it_as_the_current_one` | Name, branch, dirty and stash counts read from a path that is not the open repository, and matching what git reports for it directly — acceptance criterion 2 |
| `a_summary_never_writes_to_the_repository_it_reads` | The index's mtime is the same either side of the call. Both readings are taken with nothing in between, because `git status` itself rewrites the index to cache stat information; the first version of this test failed for exactly that reason — acceptance criterion 5 |
| `a_path_that_is_gone_is_a_card_that_says_so_rather_than_a_failure` | A deleted path returns a summary marked missing, not an `Err` — one bad entry cannot take the screen down, and criterion 3 |
| `a_directory_that_is_not_a_repository_is_also_reported_as_missing` | The same card for a directory that exists but has no `.git` |
| `a_summary_reads_a_detached_head_the_same_way_the_title_bar_does` | A detached HEAD names its commit rather than reporting no branch |
| `a_summary_of_a_repository_with_no_commits_still_names_it` | An unborn HEAD is a card, not an error |

## Rust — `recents.rs`, 8 tests

| Test | Asserts |
| --- | --- |
| `a_missing_list_reads_as_no_repositories` | No file yet is the ordinary first-launch case, not an error |
| `a_hand_edited_file_that_is_not_a_list_does_not_stop_the_application` | Truncated JSON, an object, a list of numbers, `null` and plain prose all read as an empty list — the file sits in the user's config directory and invites editing |
| `a_list_of_paths_reads_back_as_it_was_written` | The round trip through the format the module actually writes |
| `opening_a_repository_puts_it_first` | Order is last-opened-first — criterion 6 |
| `reopening_a_repository_moves_it_up_rather_than_listing_it_twice` | The earlier mention is removed, not duplicated |
| `the_list_is_capped_and_the_oldest_entry_is_what_falls_off` | 50 entries stay 50, the new one leads, and the entry dropped is the oldest — criterion 6 |
| `forgetting_removes_one_row_and_leaves_the_rest_in_order` | Forgetting is a list operation and nothing more — criterion 4 |
| `forgetting_something_that_is_not_listed_changes_nothing` | |

## Frontend

| File | What the tests assert |
| --- | --- |
| `repos/store.test.ts` (14) | The list keeps the order the backend gave it, so last-opened-first survives to the screen; a failed read records the failure and shows nothing; a superseded slow read is dropped; cards group into "needs you" and "nothing in progress", every card lands in exactly one group, and a missing repository counts as needing attention; opening a card re-reads the list afterwards; a card whose path is gone is refused rather than opened; the open repository is marked; the picker asks for a directory and re-reads afterwards; a second action is refused while one is in flight; forgetting removes the card and re-reads without any call that touches the repository; a failure to forget is recorded on `writeError`, which exists because a successful re-read clears `error` and would otherwise wipe the very failure it was reporting; clearing drops the loaded cards |
| `repos/RepoCard.test.ts` (12) | A card names the repository, its branch, its path and what it was last doing; a detached HEAD says where it is; a repository with no commits says so; one chip per thing going on and none when nothing is; conflicts lead, being what stops work; a missing repository says it is missing and offers no open action — criterion 3; the open repository is marked and is not offered again; opening fires from the card; the forget control states in its title that the directory is not touched — criterion 4; an idle card renders dashed, the device the Commit screen uses for "not yet"; a branch count appears only when there is more than one |

## Not covered by automated tests

- **Persistence across a restart** (criterion 1) needs a real config directory
  and a real process; the sweep covers it as SWEEP-1J-08.
- **The directory still being on disk after forgetting** (criterion 4) is
  asserted in the frontend only as the absence of any such call. The sweep
  checks the disk itself in SWEEP-1J-09.
- **The toolbar picker reaching the screen** (criterion 8) is navigation
  through the app shell; SWEEP-1J-10.
- `src/routes/repos/+page.svelte` is outside the coverage scope, like every
  screen shell.
