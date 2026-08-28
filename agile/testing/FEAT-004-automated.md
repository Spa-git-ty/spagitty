<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-004 — Automated tests

## Run result

```
cargo test --workspace     140 passed, 0 failed   (129 core, 11 tauri)
npm test                   393 passed, 0 failed   (23 files)
npm run check              905 files, 0 errors
cargo fmt --all --check    clean
cargo clippy --workspace --all-targets -- -D warnings   clean
```

## Coverage against the Amendment 10 floor of 70%

| Tree | Statements / Regions | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Frontend (`src/lib/**`) | 97.68% | 87.35% | 95.81% | 98.24% |
| Rust workspace | 86.94% | — | 75.19% | 85.01% |

## Rust — `branches.rs`, 20 tests

| Test | Asserts |
| --- | --- |
| `every_local_branch_is_listed` | Every branch appears, and nothing else does |
| `the_current_branch_is_marked_and_sorts_first` | Exactly one row is current, and it leads even when another sorts alphabetically before it |
| `a_detached_head_leaves_no_branch_current` | |
| `each_row_describes_its_tip` | Id, short id, summary, author and time all come from the branch's own tip |
| `merged_matches_git_branch_merged` | Every row's `merged` flag compared against `git branch --merged HEAD`, rather than against a hand-picked list |
| `a_branch_ahead_of_head_is_not_merged` | The case that matters: a branch carrying work nothing else has |
| `a_branch_with_no_upstream_reports_no_counts` | `None`, not zero — zero would claim the branch is level with something |
| `ahead_and_behind_match_git` | Both numbers compared against `git rev-list --left-right --count` |
| `a_branch_level_with_its_upstream_is_zero_and_zero_rather_than_nothing` | The distinction the previous test's `None` depends on |
| `an_upstream_configured_but_never_fetched_reports_no_counts` | A repository waiting for its first fetch is not a broken one |
| `remote_tracking_branches_are_listed_after_local_ones` | Ordering, and that `origin/HEAD` is not a row — it is a pointer at another one |
| `an_empty_repository_has_no_branches_and_is_not_an_error` | |
| `checking_out_moves_head_and_the_current_row` | The write, and that the list agrees afterwards |
| `a_checkout_that_would_overwrite_work_is_refused_with_gits_message` | `HEAD` does not move and the file on disk is byte-for-byte unchanged — nothing on this screen may discard work |
| `checking_out_a_branch_that_is_not_there_says_so` | |
| `creating_a_branch_leaves_head_where_it_was` | Creating is not checking out |
| `creating_a_branch_from_a_chosen_start_point` | |
| `creating_and_checking_out_in_one_step` | |
| `a_duplicate_name_is_refused_by_git_and_the_existing_branch_is_untouched` | The existing branch still points where it did |
| `an_invalid_name_is_refused_by_git` | Validation is git's, and its refusal is what surfaces |

## Frontend

| File | What the tests assert |
| --- | --- |
| `branches/store.test.ts` (21) | The rows keep the core's order; a failed read shows nothing; a superseded read is dropped; the text filter matches name *and* upstream, case-insensitively; each chip filters what it says; `stale` needs the whole window to have passed; chips compose as AND; the hidden count; clearing resets text and chips together; a write re-reads the list and refreshes the rail; a refusal is surfaced rather than swallowed; a second write is refused while one is in flight; create trims its inputs, sends an empty start as "HEAD", can skip the checkout, does nothing without a name, and keeps the form when git refuses |
| `branches/BranchTable.test.ts` (12) | Four columns with the design's headings; the current row is marked and offers no checkout; merged rows draw dashed but the current row never does — saying "merged" about the branch you are on reads as "safe to delete"; drift renders `↑2`, `↓3`, `↑2 ↓3` and `level`; no upstream renders `—` rather than `0`; the upstream is named and the title says the counts are as of the last fetch; a local row checks out, a remote-tracking row offers "Branch from it" and pre-fills the form; Delete is a disabled label carrying its reason; every action disables during a write; an empty repository is told apart from an over-narrow filter |

## Known gaps

- `src/routes/branches/+page.svelte` is outside the coverage scope, like every
  screen shell.
- The stale window is not configurable and has no test for the boundary in the
  Rust layer, because it is a frontend idea — the core reports a timestamp and
  nothing more.
