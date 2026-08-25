<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-018 — Automated tests

**Item:** [`agile/items/FEAT-018-fetch-and-push.md`](../items/FEAT-018-fetch-and-push.md)
**Plan:** [`agile/plans/FEAT-018-plan.md`](../plans/FEAT-018-plan.md)

## What was written

| Test | Layer | What it asserts |
| --- | --- | --- |
| `a_recorded_fetch_shows_the_flags_it_actually_used` | `crates/spagitty-core/src/shell.rs` | Updated: `git fetch --progress --prune --all`. The recorded line is the command that ran, flags and all. |
| `a_fetch_that_is_not_pruning_says_so_by_omission` | `crates/spagitty-core/src/shell.rs` | `git fetch --progress origin` — no `--prune`. `--prune` was unconditional before, so the log could not tell a fetch that deleted refs from one that did not. Now it can. |
| `settings_read_back_as_they_were_written` | `src-tauri/src/settings.rs` | Extended with `prune_on_fetch`, so the round trip covers it. |
| `the_json_keys_are_the_ones_the_webview_expects` | `src-tauri/src/settings.rs` | `pruneOnFetch` is in the serialised form. A rename on either side has to be deliberate. |
| `resolves when it has started, not when it has finished` | `src/lib/network/store.test.ts` | The shape the whole worker design rests on: no summary yet, and still running. |
| `refuses a second operation while one is running` | `src/lib/network/store.test.ts` | No second call. Two would give the screen two sets of progress to tell apart. |
| `reports a start that failed at all` | `src/lib/network/store.test.ts` | A rejected start is an error and not an operation that appears to be running. |
| `is off unless the setting says otherwise` | `src/lib/network/store.test.ts` | `prune: false` by default — the destructive step does not happen by accident. |
| `follows the setting, in one place for every caller` | `src/lib/network/store.test.ts` | The reason it is read here: a caller passing its own value could prune when the setting said not to. |
| `carries a named remote through` | `src/lib/network/store.test.ts` | Per-remote fetch reaches the API. |
| `says something before git has said anything` | `src/lib/network/store.test.ts` | "Pushing…" rather than an empty bar while the process starts. |
| `shows git’s phase and percentage` | `src/lib/network/store.test.ts` | `Receiving objects 42%`. |
| `falls back to git’s own line when there is no percentage` | `src/lib/network/store.test.ts` | "Enumerating objects: 1200, done." — no number, and still worth showing because it says the thing is alive. |
| `ignores progress from an operation that is not the one running` | `src/lib/network/store.test.ts` | Token mismatch is dropped. |
| `releases the worker, so the next one may start` | `src/lib/network/store.test.ts` | The worker cannot let go of itself; a leak would refuse every later fetch with "already running". |
| `keeps git’s last words and re-reads the repository` | `src/lib/network/store.test.ts` | The summary, the notice, and the refresh — a fetch moves remote-tracking refs, which changes what every divergence on screen means. |
| `names the operation in the notice` | `src/lib/network/store.test.ts` | "Pushed" for a push. |
| `reports a failure with git’s own message` | `src/lib/network/store.test.ts` | `non-fast-forward` reaches both the store and the notice. |
| `ignores a done event for an operation that is not the one running` | `src/lib/network/store.test.ts` | Still running, and no summary from somebody else's operation. |
| `fetches without asking — nothing is lost by fetching` | `src/lib/graph/actions.test.ts` | Rewritten for the new shape: no confirmation, and the worker is started. |
| `pushes without asking` | `src/lib/graph/actions.test.ts` | The same. A push that would lose something is refused by git rather than by a dialog we would have to keep in step with git's rules. |
| `reports a start that failed, which is the only outcome it sees` | `src/lib/graph/actions.test.ts` | The one failure this layer still sees; the rest arrive on the done event. |
| `says nothing when a start was refused for no stated reason` | `src/lib/graph/actions.test.ts` | No notice without a message to put in it. |
| `shows the stored state of every toggle` | `src/lib/settings/sections.test.ts` | Extended to four toggles, the fourth off. |

## What was changed

Three assertions in `actions.test.ts` were rewritten rather than kept. They
asserted `ok('Fetched')` and `ok('Pushed')` immediately after the call, which
describes the blocking shape this item replaced. The behaviour they protected —
that neither operation asks a question, and that a failure is reported with
git's words — is asserted again, split across the two layers that now own the
two halves.

`actions.test.ts` mocks the network store rather than driving the real one. It
is a module singleton holding a live token, so a real one would still be running
the first test's fetch during the second test's push.

## What is not covered

- **The worker itself.** `network_worker.rs` has no unit test: it is a thread, a
  process and an `AppHandle`. What it computes that could be wrong — parsing
  git's progress lines — is `clone::progress`, which has its own tests from
  FEAT-012 and is now shared by three operations.
- **A real fetch or push.** Both need a remote, and this suite builds none.
  SWEEP-018-01 through -05 are where the flags meet a network.
- **The toolbar's fetch menu.** `Toolbar.svelte` is not mounted in this suite;
  SWEEP-018-03.
