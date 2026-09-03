<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-021 — Plan

**Item:** [`agile/items/BUG-021-a-run-says-nothing-until-it-ends.md`](../items/BUG-021-a-run-says-nothing-until-it-ends.md)

**Depends on:** BUG-020. A window that freezes while it plans cannot be watched
while it plans, so this branch carries that fix.

## Approach

### The narrator, and where it sits

A new `crates/spagitty-farm/src/execution/narrate.rs`: a `Narrator` trait with
one method, `narrate(&mut self, raw: &str) -> Vec<String>`, and two
implementations — `Verbatim`, which is the default and changes nothing, and
`ClaudeStream`, which reads Claude Code's `--output-format stream-json`.

It is placed **between the pipe and everything else**, inside
`execution::process::pump`, so both the live `Sink` and the transcript file see
the same narrated lines.

That position is the decision worth arguing, because the obvious alternative is
worse in a way that would not have shown up for weeks. Narrating in the
interface — parsing the JSON in the store, or in a Svelte component — would put
the raw stream in the transcript file, and the transcript file is not a
debugging artifact: `Handoff::parse` and `Plan::parse` both read it, looking for
a fenced block the agent was asked to write. In raw stream-json that fence is
inside a JSON string, escaped, on one line. Both parsers would find nothing, and
would say so by quietly leaving every task without a handoff. Narrating first
means the file holds the agent's own words and everything downstream is
untouched — which is what the new process-level test asserts.

The narrator is chosen by the adapter, next to the flags that made it necessary:
`AgentAdapter::narrator()` defaults to `Verbatim`, and `ClaudeAdapter` overrides
it in the same file where it adds `--output-format stream-json --verbose`.

### What the narration keeps

Read from a real run of `claude 2.1.259`, not from documentation:

| Event | Becomes |
| --- | --- |
| `system` / `init` | `· claude-opus-5 started` |
| `system` / hooks, token estimates; `rate_limit_event` | nothing |
| `assistant` → `text` | the agent's own words, line for line |
| `assistant` → `tool_use` | `· Read src/auth.rs`, `· Bash cargo test` |
| `assistant` → `thinking` | nothing |
| `user` → failing `tool_result` | `· No such file` |
| `result` | the answer, if it was not already said, then `· finished in 12s` |

A line that is not JSON passes through unchanged — version-manager banners,
progress bars, anything an agent prints before it starts. A line that *is* one
of the provider's envelopes but carries a kind not in that table is dropped
rather than passed through: it parsed as an envelope, so printing it raw would
put JSON in a log meant to be read.

`result` repeats the last assistant message, which is why the narrator is
stateful: printing it again would put a second handoff block in the transcript.
It is emitted only when it is genuinely new — a run that ends without an
assistant message must not lose its answer.

### The planning run becomes visible

`PlanningCard.svelte` in the Farm header while a planning run is in flight: how
long, the last thing the planner said, and **Stop planning**. The elapsed time
is read from the run record rather than from when the screen noticed, so it
survives leaving the screen and coming back.

`cancel_plan` signals the planning session **without removing it from the map**.
The collector thread owns that session and is waiting on it, and it is that
thread which decides what a cancelled plan means — a cancelled planner has said
half of a decomposition, and adopting an arbitrary prefix of one is worse than
adopting nothing, because the tasks look deliberate.

`collect_plan` also learns to read its own outcome: the run is recorded as
cancelled or failed rather than always `Completed { exit_code: 0 }`, an
`AgentStopped` event closes it, and a plan that adopted no tasks emits a
`Failed` event pointing at the transcript.

### One refactor that came with it

`spawn_run` reached eight arguments, four of them identifiers of the same shape.
It takes a `Launch` struct now — the argument list where a caller silently swaps
two is the one worth removing (Amendment 7).

## Alternatives considered

**`--include-partial-messages` for token-level streaming.** More events, no more
information: the farm's log is a record of what was done, and a word-by-word
feed of prose is a spinner with extra cost.

**Emitting the raw stream and narrating in the front end.** The transcript
argument above. It also puts a provider's schema in the webview, where the
crate's whole design says provider-specific strings do not go.

**Leaving the transcript raw and narrating only the live events.** Two
representations of one run, and the file — the one that survives a restart —
would be the unreadable one.

## Files

| File | Change |
| --- | --- |
| `crates/spagitty-farm/src/execution/narrate.rs` | New. The trait, `Verbatim`, `ClaudeStream`, and their tests. |
| `crates/spagitty-farm/src/execution/process.rs` | `start` takes a narrator; `pump` runs each raw line through it. |
| `crates/spagitty-farm/src/agent/adapter.rs` | `narrator()` on the trait, defaulting to `Verbatim`. |
| `crates/spagitty-farm/src/agent/adapters/claude.rs` | Streaming flags and `ClaudeStream`. |
| `crates/spagitty-farm/src/service.rs` | `Launch`; outcome-aware `collect_plan`; `cancel_plan`. |
| `src-tauri/src/farm.rs`, `src-tauri/src/lib.rs` | `farm_cancel_plan`. |
| `src/lib/farm/components/PlanningCard.svelte` | New. |
| `src/lib/farm/store.svelte.ts`, `api.ts`, `src/routes/farm/+page.svelte` | `planning`, `planningRun`, `cancelPlan`, and the card. |

## Risks and rollback

- **The stream-json schema is a provider's, and providers change.** Every
  unknown shape falls through to "pass it on" or "drop the envelope", never to a
  panic, and the flags are before `extra_args` so a user can override them.
- **A definition saved before this change** keeps working: the flags are built
  per run by the adapter, not stored on the definition.
- **Rollback** is a revert. Nothing is persisted in a new shape; transcripts
  written under the old behaviour still parse.
