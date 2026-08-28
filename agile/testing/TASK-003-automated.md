<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-003 — Automated tests

**Item:** [`agile/items/TASK-003-runtime-generic-tauri-layer.md`](../items/TASK-003-runtime-generic-tauri-layer.md)
**Plan:** [`agile/plans/TASK-003-plan.md`](../plans/TASK-003-plan.md)

The point of the item. Before it, none of these could be written: every one of
them needs an `AppHandle`, and the only one available was bound to the Wry
runtime.

## What was written

| Test | Layer | What it asserts |
| --- | --- | --- |
| `a_request_delivers_exactly_the_rows_asked_for_and_then_stops` | `src-tauri/src/graph_worker.rs` | Three rows out of a twenty-commit history, and nothing more once it has them. The whole backpressure mechanism in one assertion. |
| `a_second_request_resumes_the_walk_rather_than_restarting_it` | `src-tauri/src/graph_worker.rs` | Indices `0,1,2,3` across two requests, not `0,1,0,1`. A restart would repaint the first rows and the UI would show each commit twice. |
| `a_large_request_paints_in_batches_and_flushes_the_partial_one` | `src-tauri/src/graph_worker.rs` | Batch sizes `[BATCH, 40]` for a request of `BATCH + 40`. Two things at once because they are one mechanism: rows go out at `BATCH` so a big request paints progressively, and the remainder is flushed before the worker sleeps. Without the flush the tail of every request is invisible until the next scroll. |
| `stopping_ends_the_walk_and_says_the_row_count_is_not_final` | `src-tauri/src/graph_worker.rs` | `complete: false` and the delivered total, after a drop. `complete` is what stops the UI treating a closed repository's row count as the length of its history. |
| `a_zero_row_request_does_not_start_a_walk` | `src-tauri/src/graph_worker.rs` | No rows, no `done`, and the worker still answers a real request afterwards. Nothing to deliver is not a reason to open the repository, and a budget of zero would underflow on the first row. |
| `reaching_the_end_of_history_reports_a_complete_walk` | `src-tauri/src/graph_worker.rs` | `complete: true`, total 4, no error, when more rows are asked for than exist. |
| `a_walk_that_cannot_start_reports_the_error_rather_than_going_quiet` | `src-tauri/src/graph_worker.rs` | A directory that is not a repository produces a `done` carrying a message, not a panic in the worker thread. |
| `a_burst_from_one_commit_becomes_one_refresh` | `src-tauri/src/watch.rs` | Index, HEAD, ref and reflog written within milliseconds coalesce into a single event carrying both flags. |
| `a_burst_that_changes_nothing_emits_nothing` | `src-tauri/src/watch.rs` | Reads, lock files and `COMMIT_EDITMSG` produce nothing at all — not even an empty payload. Emitting for a read is the feedback loop `is_change` exists to prevent. |
| `a_change_after_the_repository_settles_is_its_own_refresh` | `src-tauri/src/watch.rs` | The complement of coalescing: two operations a quiet period apart are two events. A debounce that swallowed the second would leave the UI stale. |
| `a_command_against_no_open_repository_says_so` | `src-tauri/src/commands.rs` | `Error::NoRepository` from five commands, including `graph_request`. The first thing every screen does on a cold start. |
| `opening_a_repository_starts_a_walk_and_reports_what_is_there` | `src-tauri/src/commands.rs` | HEAD is read, and **no rows are emitted until asked for** — opening walks nothing. |
| `opening_a_second_repository_replaces_the_first` | `src-tauri/src/commands.rs` | A new token, the new repository answering afterwards, and the replacement finishing within a deadline. Replacing the session drops the previous worker and watcher, which joins both threads; if either ignored the shutdown this would hang rather than fail. |
| `a_request_against_a_replaced_walk_is_ignored_rather_than_refused` | `src-tauri/src/commands.rs` | A stale token is `Ok(())` and emits nothing, and the live walk still answers. The UI can send a request that raced a refresh. |
| `restarting_the_walk_produces_a_new_token_and_leaves_the_old_one_stale` | `src-tauri/src/commands.rs` | The token changes and the old one names nothing, which is not an error. |
| `closing_puts_the_session_back_to_having_no_repository` | `src-tauri/src/commands.rs` | And closing finishes within a deadline, for the same joining reason. |
| `opening_something_that_is_not_a_repository_leaves_the_session_alone` | `src-tauri/src/commands.rs` | The failure does not tear down the repository the user already had open, which is what a half-replaced session would do. |

Existing tests unchanged: `watch`'s eleven `classify` and `is_change` cases from
TASK-002 still stand, and the debounce tests sit beside them.

## What is not covered

- **`clone_worker`, `network_worker`, `rebase_worker`, `search_worker`.** Each
  spawns `git` and parses its stderr; a fixture that fetches, pushes or clones
  belongs to those items, not this one. They are generic now, which is what was
  in the way.
- **`watch::watch`.** The registration call into `notify`. The loop it spawns is
  tested; whether the platform gives us a watcher is not our logic.
- **Every command that is a one-line forward into `spagitty-core`.** They are
  covered where the logic is, in the core's own tests. What is tested here is
  the session: what happens with none open, with one replaced, and with a token
  that no longer names anything.
- **Coverage of `testing.rs` itself.** Excluded from the measurement, with
  `fixture.rs`, for the reason in the plan.
