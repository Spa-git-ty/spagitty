<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-020 — Automated tests

## Run result

```
npm test                   785 passed, 0 failed   (45 files)
npm run check              978 files, 0 errors, 0 warnings
cargo test --workspace     272 passed, 0 failed   (spagitty-core)
cargo clippy --all-targets clean
cargo fmt --all --check    clean
```

Up from 760 frontend tests and 257 core tests at FEAT-022: 25 frontend tests
(13 in `commandlog/store.test.ts`, 8 in `commandlog/CommandLog.test.ts`, 4 more
in `palette/commands.test.ts` and the reshaped cases around them) and 15 Rust
tests (12 in `record.rs`, 3 in `shell.rs`).

`cargo fmt` also reformatted `crates/spagitty-core/src/ops.rs`, which had been
left unformatted by FEAT-022. No behaviour there changed.

## Coverage against the Amendment 10 floor of 70%

| Tree | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| `src/lib/commandlog/**` | 92.70% | 91.30% | 90.00% | 90.62% |
| `src/lib/commandlog/store.svelte.ts` | 100% | 92.85% | 100% | 100% |
| `src/lib/commandlog/CommandLog.svelte` | 87.50% | 88.88% | 81.81% | 80.64% |
| Frontend total (`src/lib/**`) | 79.26% | 63.45% | 75.23% | 78.77% |

The uncovered lines in the component are the clipboard handlers' failure branch
and the two copy buttons, which a headless DOM cannot exercise honestly — the
sweep covers them instead.

**The frontend total's branch figure fails the configured threshold, and it did
before this item.** `vite.config.ts` sets all four thresholds to 70; the run on
`feature/FEAT-022-graph-parity` measured 63.00% branches, and this item moved it
to 63.45%. So the coverage gate (Amendment 16, gate 3) is red on the branch this
work was cut from, not because of it. Statements, functions and lines are all
above the floor. Raising branch coverage across the screens built in FEAT-001 to
FEAT-012 is its own task and is not smuggled in here.

## Rust — `record.rs`, 12 tests

| Test | Asserts |
| --- | --- |
| `a_recorded_command_names_git_first` | The line begins `git`, and no caller can record one that does not |
| `an_argument_with_a_space_is_quoted_so_the_line_can_be_pasted_back` | A commit message stays one argument |
| `an_empty_argument_survives_as_an_empty_quoted_one` | `-m ""` is not silently dropped |
| `a_password_in_a_clone_url_is_replaced` | `https://user:token@host/…` becomes `https://user:***@host/…` |
| `a_url_without_credentials_is_left_exactly_as_it_was` | HTTPS, scp-style SSH, `ssh://`, a plain path and a flag are all untouched |
| `an_at_sign_in_the_path_is_not_mistaken_for_credentials` | `https://host/repos/user@example.com/…` survives whole |
| `a_long_stderr_is_cut_rather_than_stored_whole` | The cut is visible, and the buffer is not a second place output accumulates |
| `a_short_stderr_is_kept_whole` | The common case is not truncated |
| `recording_keeps_the_newest_and_never_repeats_a_sequence_number` | The cap holds and the ordering the UI depends on is real |
| `what_is_recorded_is_what_the_caller_ran_with_git_in_front` | argv, duration and exit code round-trip |
| `the_observer_sees_every_execution_as_it_happens` | Each execution reaches the observer once, in order |
| `clearing_drops_everything_recorded_before_it` | Clear means clear |

The buffer is process-wide and the test binary is threaded, so tests that assert
about the buffer as a whole take `record::test_gate` — otherwise one test's
`clear` would evict another's entries and both would be intermittently wrong.

## Rust — `shell.rs`, 3 new tests

| Test | Asserts |
| --- | --- |
| `every_execution_reaches_the_record_with_the_flags_this_module_added` | A fetch records `git fetch --prune --progress --all`. This is the test that would fail if the record were ever moved up into a screen |
| `a_failing_command_is_recorded_with_its_exit_code_and_gits_words` | Exit 128 and git's stderr are both kept, and the caller still gets the same `Error::Git` |
| `a_clone_is_recorded_at_spawn_with_its_credentials_removed` | Recorded as `started` without waiting, and the token in the URL never reaches the buffer |

## Frontend — `commandlog/store.test.ts`, 13 tests

Covers: entries arriving from the event; the event and the catch-up read
overlapping without duplicating (`seq` is the identity, not the text); asking
only for what is not already held; the cap; ordering when an entry arrives late;
opening reading the backlog; a failed read and a failed clear both reported
rather than swallowed; toggling; the no-backend path doing nothing at all; the
listener detaching; and the four line-rendering cases including an embedded
quote.

## Frontend — `commandlog/CommandLog.test.ts`, 8 tests

Covers: nothing rendered while closed; the command shown with the shell layer's
flags; a failure showing git's words and its exit code; a clone shown as running
rather than finished; newest first; the in-process footnote; the empty state
explaining itself; and closing from the header.

## Frontend — `palette/commands.test.ts`

`offers the command log only once the Settings toggle is on` — disabled with a
reason naming Settings, enabled after the toggle is read as true.

## What is not covered by automation

- The clipboard. Both copy buttons and their failure path are sweep tickets.
- That the panel updates *while* a long operation runs. The event path is
  tested, but the liveness of it against a real multi-second clone is
  SWEEP-020-08.
- Cross-platform behaviour of the recorded lines on Windows paths.
