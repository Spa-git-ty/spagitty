<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-005 — Automated tests

## Run result

```
cargo test --workspace     152 passed, 0 failed   (141 core, 11 tauri)
npm test                   419 passed, 0 failed   (25 files)
npm run check              910 files, 0 errors
cargo fmt --all --check    clean
cargo clippy --workspace --all-targets -- -D warnings   clean
```

## Coverage against the Amendment 10 floor of 70%

| Tree | Statements / Regions | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Frontend (`src/lib/**`) | 97.51% | 86.51% | 95.24% | 98.07% |
| Rust workspace | 87.33% | — | 75.76% | 85.29% |

## Rust — `stash.rs`, 12 tests

| Test | Asserts |
| --- | --- |
| `a_repository_with_no_stash_has_an_empty_list_rather_than_an_error` | No `refs/stash` is an empty list, not a failure |
| `entries_are_newest_first_and_named_the_way_git_names_them` | `stash@{0}` is the most recent; the index comes from the reflog's order, not from parsing a message |
| `the_list_matches_git_stash_list` | Every id compared against `git stash list --format=%H`, in order |
| `an_entry_hangs_off_the_commit_it_was_made_on` | Parent id, short id and summary — what the lane draws |
| `an_entry_carries_who_stashed_it_and_when` | |
| `what_is_in_an_entry_is_the_diff_against_its_parent` | `commit_diff` on the entry's id gives the same files as `git stash show --name-only` — the reason there is no diffing code in the module |
| `stashing_cleans_the_working_copy_and_adds_the_newest_entry` | `git status --porcelain` is empty afterwards and the message survives trimming |
| `stashing_leaves_untracked_files_alone_unless_asked` | An untracked file is still there afterwards |
| `stashing_can_take_untracked_files_too` | And is gone when it was asked for |
| `stashing_nothing_is_refused_rather_than_reported_as_done` | `git stash push` succeeds quietly with nothing to save; the core refuses instead, and no entry appears |
| `untracked_files_alone_are_not_something_to_stash_unless_asked` | The refusal names untracked files as the reason, and the same working copy *is* stashable with them included |
| `a_bare_repository_has_no_working_copy_to_stash` | |

## Frontend

| File | What the tests assert |
| --- | --- |
| `stash/store.test.ts` (15) | The list opens the newest entry and reads it through `commitDiff` — because a stash is a commit; nothing is selected when there is no stash; a failed read shows nothing; the open entry survives a reload when it still exists and falls back to the newest when it does not; superseded list and contents reads are dropped; re-selecting the open entry does not re-read it; a contents failure leaves the list intact; pushing clears the message, re-reads and refreshes the rail; the untracked flag is passed through; a refused push keeps the message; a second push is refused while one is in flight |
| `stash/panes.test.ts` (11) | Each entry is named `stash@{n}` and says what it hangs off; the lane draws two nodes and a curved elbow, so an entry reads as hanging off a commit rather than as a flat row; clicking opens an entry and the open one is marked; an empty list explains what a stash is; the detail panel shows the entry, its author, its base and its files, with a dotfile still reading as a dotfile; "Open full diff" goes to the Diff screen with the entry's own id; pop, apply and drop are labels carrying what each would do, and the panel names the terminal command that does it today; an entry that changed nothing says so; a read failure replaces the file list |

## Known gaps

- Pop, apply and drop have no tests because they have no code — FEAT-014.
- `src/routes/stash/+page.svelte` is outside the coverage scope, like every
  screen shell.
