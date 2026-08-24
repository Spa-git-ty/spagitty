<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-009 — Automated tests

## Run result

```
cargo test --workspace     236 passed, 0 failed   (217 core, 19 tauri)
npm test                   568 passed, 0 failed   (33 files)
npm run check              933 files, 0 errors
cargo fmt --all --check    clean
cargo clippy --workspace --all-targets -- -D warnings   clean
```

## Coverage against the Amendment 10 floor of 70%

| Tree | Statements / Regions | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Frontend (`src/lib/**`) | 96.35% | 84.16% | 93.82% | 96.67% |
| `src/lib/rebase/**` | 95.63% | 77.94% | 96.36% | 96.32% |
| Rust workspace | 88.14% | — | 76.83% | 86.96% |
| `crates/spagitty-core/src/rebase.rs` | 94.20% | — | 83.33% | 93.87% |

## Rust — `rebase.rs`, 20 tests

| Test | Asserts |
| --- | --- |
| `the_todo_list_is_what_git_rebase_would_open` | Compared line for line against `git rev-list --reverse --no-merges <upstream>..HEAD`, plus the upstream it resolved — acceptance criterion 1 |
| `the_todo_list_is_oldest_first_because_a_rebase_replays_forwards` | The direction git lists them in, which is the opposite of the graph's |
| `merges_are_left_out_because_a_rebase_does_not_replay_them` | `git rebase` without `--rebase-merges` does not replay a merge, and listing one would promise something the execution cannot keep |
| `a_row_carries_the_paths_its_commit_changed` | What the conflict heuristic compares |
| `a_branch_with_no_merge_base_is_refused_with_a_reason` | An orphan branch against `main` — criterion 6, and the message names why |
| `an_unknown_upstream_is_an_error` | |
| `a_plan_that_changes_nothing_previews_the_branch_as_it_is` | |
| `a_squash_removes_a_row_and_folds_it_into_the_one_above` | Criterion 2's squash half: the row leaves the result and the row above records what it absorbed |
| `a_leading_squash_is_refused_because_there_is_nothing_above_it` | The same refusal `git rebase` gives |
| `a_drop_takes_the_commit_out_of_the_result` | |
| `a_reword_keeps_the_row_and_marks_it` | The message is asked for at execution time, which is git's own behaviour |
| `dropping_every_commit_is_an_empty_preview_and_a_warning_not_an_error` | Criterion 3. An empty result is a legitimate thing to look at before deciding against it |
| `reordering_is_the_order_of_the_edits` | The plan is a list; moving a row is moving an entry |
| `a_commit_the_plan_never_mentions_is_kept_rather_than_lost` | Drift between the screen and the repository appends the commit rather than dropping it silently |
| `an_edit_naming_a_commit_that_is_not_there_is_ignored` | The same drift, the other way round |
| `a_commit_named_twice_is_only_placed_once` | One row per commit, whatever the plan says |
| `two_commits_touching_one_path_mark_the_later_one_as_maybe_conflicting` | Criterion 4 |
| `commits_touching_different_paths_are_not_flagged` | The heuristic does not warn about everything, which would make it useless |
| `planning_never_touches_the_repository` | Criterion 5. After reword, squash, reorder and drop-everything plans: HEAD unchanged, `git status --porcelain` empty, and neither `.git/rebase-merge` nor `.git/rebase-apply` exists |
| `a_range_longer_than_the_cap_says_it_was_cut` | 255 commits give 250 rows and `truncated`. The cap is reported, not applied silently |

## Frontend

| File | What the tests assert |
| --- | --- |
| `rebase/store.test.ts` (22) | Planning without an upstream is refused; the plan starts unedited in git's order and the upstream is trimmed; the unedited plan is previewed without being asked; a refusal is recorded and shows nothing; the first row takes focus so the keyboard has somewhere to start; setting an action recomputes and sends the *complete* plan rather than only what changed; an action for a commit that is not in the plan is ignored; rows move up and down but not off either end, and a moved row keeps the focus so it can be moved again; an action or a reorder makes the plan edited and Reset undoes it; a superseded preview is dropped; a preview failure is recorded; plan entries pair with their commits in plan order; a refusal is carried through rather than the plan looking fine; a plan that empties the branch is a warning and not a failure; every action names what it does |
| `rebase/panes.test.ts` (21) | One row per commit in plan order with summary and short id; every action offered with the current one marked and each chip saying what it would do; clicking an action sets it; a dropped commit stays visible and reads as spent, using the dashed device the Branches screen uses for a merged branch; `⌥↓` moves a row while a plain arrow does not; the focused row is marked; a drag moves the row it was dropped onto, dropping on itself changes nothing, a drop with nothing dragged is ignored, and ending a drag without dropping leaves the plan alone; the handle names both ways to reorder; the preview says what it is for before anything is planned, draws one row per surviving commit, counts what was folded in, marks a reworded row, says "may conflict" in that word, counts what was dropped, explains a plan that empties the branch, and refuses to draw a result for a plan that cannot run |

## Not covered by automated tests

- **The disabled Apply button** (criterion 7) is markup: `disabled` with a title
  naming FEAT-015. There is no command behind it — nothing to call and nothing
  to assert against — so the sweep confirms it, SWEEP-1E-11.
- **The upstream picker being fed from the branch list** is wiring in the route
  shell, which is outside the coverage scope like every screen shell;
  SWEEP-1E-02.
- `src/routes/rebase/+page.svelte` is outside the coverage scope.
