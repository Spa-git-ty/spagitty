<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-021 — A run says nothing until it ends

**Status:** Fixed, awaiting sweep
**Branch:** `bugfix/BUG-021-runs-say-nothing`
**Screens:** Farm (1Q).

## Problem

Start a task, or ask an agent to plan, and the farm goes quiet. The task shows a
status word and nothing else: no output, no sign of progress, no way to tell a
model reading the repository from a process that died four minutes ago. The
transcript pane stays empty for the whole run and fills in one go at the end.

**Three faults, of which the first is the cause.**

**Claude Code was asked for its answer, not for its work.** The adapter ran
`claude -p <prompt>`, whose default output format writes once, when the turn is
over. `execution::process` streams every line it is given the instant it arrives
— there were simply no lines to stream. The provider has a streaming mode,
`--output-format stream-json`, and the farm was not using it.

**A planning run belongs to no task, so no screen showed it.** Planning files
its output under the task identifier `planning`, which is not in `farm.tasks`.
The store collected those lines correctly and nothing ever asked for them. The
whole of a planning run's visible existence was the word "Planning" on a chip,
with no elapsed time, no output, and no way to stop it: `farm_cancel` cancels
every task in the farm, which is not what a person who changed their mind about
a decomposition wants.

**A planning run that produced nothing said nothing about it.** `collect_plan`
recorded every run as `Completed { exit_code: 0 }` whatever the process did,
then adopted however many tasks it could parse — often none, if the planner
refused, hit a rate limit, or answered without a plan block. The farm went back
to Idle with an empty plan, indistinguishable from a farm nobody had asked.

## Reproduction

1. Open a repository, detect Claude Code, write a goal.
2. Press **Plan it**, or run any task.

**Observed:** nothing at all until the run finishes, then everything at once.
**Expected:** the agent's work appears as it happens — what it read, what it
edited, what it said — and a planning run can be watched and stopped.

**Environment:** any. Codex narrates its own work on stdout and is unaffected;
the silence is specific to providers invoked in a one-shot print mode.

## Scope

- Claude Code runs in streaming mode, and what it streams is narrated into
  lines a person reads.
- The narration happens before the transcript is written, so the
  `spagitty-handoff` and `spagitty-plan` blocks still parse.
- A planning run in flight is visible on the Farm screen: elapsed time, the last
  thing the planner said, and a control that stops the planner alone.
- A planning run that is cancelled adopts nothing, and one that produces no
  tasks says so.

## Non-scope

- **Cursor and Oh My Pi.** `cursor-agent` is not installed on this machine and
  Oh My Pi's streaming behaviour has not been observed, so neither adapter is
  changed on a guess. Both keep the default verbatim narrator, which is correct
  for anything that already prints prose.
- **Codex.** `codex exec` already narrates its work on stdout. `--json` exists,
  but adopting an event schema nobody here has read would replace working output
  with a guess.
- **Where the transcript is read.** The activity strip is still six lines along
  the bottom of the screen; making it a log worth reading is its own item.

## Acceptance criteria

- A Claude Code run produces transcript lines while it is running, not only at
  the end.
- A run's handoff block still parses, and a planning run's plan block still
  parses, from the narrated transcript.
- The Farm screen shows a planning run's elapsed time and its latest line, and
  stops it without cancelling the farm.
- A cancelled planning run leaves the plan untouched.
- A planning run that adopts no tasks emits a failure the screen can show.
- Output from an agent that does not stream JSON is unchanged, character for
  character.
