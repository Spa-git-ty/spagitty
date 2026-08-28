<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-015 — Automated tests

**Item:** [`agile/items/FEAT-015-rebase-execution.md`](../items/FEAT-015-rebase-execution.md)
**Plan:** [`agile/plans/FEAT-015-plan.md`](../plans/FEAT-015-plan.md)

## What was written

| Test | Layer | What it asserts |
| --- | --- | --- |
| `a_repository_that_is_not_rebasing_has_no_progress` | `crates/spagitty-core/src/rebase.rs` | `None`, not a zero. "Not rebasing" and "rebasing, position unknown" are different answers and only one should paint a bar. |
| `an_interactive_rebase_reports_its_step_and_total` | `crates/spagitty-core/src/rebase.rs` | `msgnum` and `end` are read as step and total. |
| `an_old_style_rebase_counts_the_same_way` | `crates/spagitty-core/src/rebase.rs` | `rebase-apply/next` and `last` too, so a rebase started from the command line is legible. |
| `the_branch_is_reported_without_its_refs_heads_prefix` | `crates/spagitty-core/src/rebase.rs` | `head-name` is trimmed to the branch name people recognise. |
| `a_rebase_from_a_detached_head_has_no_branch` | `crates/spagitty-core/src/rebase.rs` | `None` rather than an invented name. |
| `the_original_position_is_shortened_for_showing` | `crates/spagitty-core/src/rebase.rs` | `ORIG_HEAD` comes back as a short id, which is all it is ever used as. |
| `a_state_directory_with_no_counters_is_not_progress` | `crates/spagitty-core/src/rebase.rs` | git creates the directory before writing the numbers; reading that as step 0 of 0 would flash a bar at zero. |
| `a_rebase_that_conflicts_stops_and_leaves_state_to_read` | `crates/spagitty-core/src/ops.rs` | An end-to-end conflict: git stops, and the counters it leaves say where. The hand-off the screen is built around, against a real rebase rather than a written file. |
| `aborting_puts_the_branch_back_and_clears_the_state` | `crates/spagitty-core/src/ops.rs` | `HEAD` is back where it started and there is no rebase in progress afterwards. |
| `resolves when the rebase has started, not when it has finished` | `src/lib/rebase/store.test.ts` | `run` resolves on start with no outcome decided — the shape the whole worker design rests on. |
| `sends the whole plan, so what was previewed is what runs` | `src/lib/rebase/store.test.ts` | The plan reaching the API is the plan the preview was computed from. |
| `refuses a second rebase while one is running` | `src/lib/rebase/store.test.ts` | No second call. Two sets of progress events with one screen to show them is not a state worth having. |
| `reports a rebase that could not be started at all` | `src/lib/rebase/store.test.ts` | A rejected start is `failed` with the message, not a rebase that appears to be running. |
| `follows the step count` | `src/lib/rebase/store.test.ts` | A progress event becomes the store's progress. |
| `ignores steps from a rebase that is not the one running` | `src/lib/rebase/store.test.ts` | Token mismatch is dropped. |
| `finishes when git got to the end` | `src/lib/rebase/store.test.ts` | `ran`, and no longer running. |
| `calls a stop a stop, not a failure` | `src/lib/rebase/store.test.ts` | The distinction the hand-off rests on: a non-zero exit with state left behind is `stopped`. |
| `reports a real failure with git’s own words` | `src/lib/rebase/store.test.ts` | `failed`, carrying git's message rather than one of ours. |
| `is recognised on arrival, not only after this screen ran one` | `src/lib/rebase/store.test.ts` | A rebase left by a previous session or a terminal is `stopped` after one read. |
| `continues, and re-reads where that left things` | `src/lib/rebase/store.test.ts` | Continue's own result cannot say whether the rebase finished, so the repository is asked. |
| `knows when continuing stopped it again` | `src/lib/rebase/store.test.ts` | A second stop is `stopped` at the new step, not `ran`. |
| `surfaces a refusal rather than pretending it worked` | `src/lib/rebase/store.test.ts` | git's "unresolved conflicts" reaches `runError`. |
| `skips and aborts through the same path` | `src/lib/rebase/store.test.ts` | Both controls go through `control`, so all three re-read afterwards. |
| `refuses a control while the worker is still running` | `src/lib/rebase/store.test.ts` | Abort during a running rebase does not reach git — the command would race the worker that is reading the state it unwinds. |
| `names the branch, the count, and what becomes of the originals` | `src/lib/rebase/actions.test.ts` | All four things the item asked to be named, in the confirmation. |
| `has a word for a branch it cannot name` | `src/lib/rebase/actions.test.ts` | A detached HEAD gets "this branch", not an empty gap in a sentence. |
| `says separately when the plan drops commits` / `says nothing about dropping when nothing is dropped` | `src/lib/rebase/actions.test.ts` | Dropped commits are a different loss and are called out only when there are any. |
| `asks before anything runs, and is painted as destructive` | `src/lib/rebase/actions.test.ts` | The dialog is open and the store has been called zero times. |
| `does nothing when the question is dismissed` / `asks nothing about an empty plan` | `src/lib/rebase/actions.test.ts` | Neither reaches git. |
| `continues without asking — it is what the user came back to do` | `src/lib/rebase/actions.test.ts` | No dialog on the one control that is not destructive. |
| `asks before skipping, because the commit is dropped` | `src/lib/rebase/actions.test.ts` | Skip is a drop and is treated as one. |
| `warns that aborting throws away the resolutions too` | `src/lib/rebase/actions.test.ts` | The part nobody expects, in the body. |

## What is not covered

- **The worker itself.** `rebase_worker.rs` has no unit test: it is a thread, a
  process and an `AppHandle`, and a test double for all three would assert the
  double. What it computes that could be wrong — telling a stop from a failure —
  is the state-directory read, which is tested in the core.
- **Progress arriving during a real rebase.** The polling interval against a
  rebase fast enough to finish inside one tick is a race by construction. The
  numbers are tested; the timing is SWEEP-015-02.
- **The route.** Running, stopped and planning are three shapes of
  `src/routes/rebase/+page.svelte`, which this suite reads rather than mounts.
  SWEEP-015-01, -03 and -07.
