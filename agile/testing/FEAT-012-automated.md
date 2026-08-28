<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-012 — Automated tests

## Run result

```
cargo test --workspace     284 passed, 0 failed   (250 core, 34 tauri)
npm test                   685 passed, 0 failed   (39 files)
npm run check              951 files, 0 errors
cargo fmt --all --check    clean
cargo clippy --workspace --all-targets -- -D warnings   clean
```

Up from 264 Rust and 645 frontend at FEAT-011: 20 Rust tests (18 in
`clone.rs`, 2 in `shell.rs`) and 40 frontend tests.

## Coverage against the Amendment 10 floor of 70%

| Tree | Regions / Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Rust workspace | 86.27% | — | 76.17% | 84.98% |
| `crates/spagitty-core/src/clone.rs` | 99.05% | — | 97.14% | 99.21% |
| `src-tauri/src/clone_worker.rs` | 0.00% | — | 0.00% | 0.00% |
| Frontend (`src/lib/**`) | 95.90% | 82.55% | 93.64% | 97.03% |
| `src/lib/clone/**` | 89.39% | 83.33% | 80.85% | 94.81% |

`clone_worker.rs` is at zero, like `graph_worker.rs` and `search_worker.rs`
before it and for the same reason: every path needs a `tauri::AppHandle` to emit
on, and one cannot be built without starting an application. The logic that
could be wrong was deliberately kept out of it — the destination, the refusals,
the progress parsing and the "is this step worth an event" rule are all in
`clone.rs` at 99%. What remains in the worker is plumbing: read a pipe, kill a
child, emit two events. SWEEP-1L-06 through SWEEP-1L-09 cover it by hand.

## Rust — `crates/spagitty-core/src/clone.rs`, 18 tests

### Where the clone lands

| Test | Asserts |
| --- | --- |
| `the_name_is_the_last_segment_the_way_git_clone_derives_it` | Eight address forms — HTTPS, scp-style, ssh with a port, a local path, `file://`, with and without `.git`, with a trailing slash |
| `a_bare_host_gives_the_host_as_the_name_the_way_git_clone_does` | Not a special case: refusing it would make Spagitty stricter than the command line for no visible reason |
| `a_name_that_would_escape_the_chosen_folder_is_refused` | `..` and friends. The destination is `parent.join(name)`, so a name of `..` would put the clone somewhere the user was never shown |
| `the_destination_is_the_exact_path_that_will_be_created` | Criterion 2 |

### What is refused, before anything runs

| Test | Asserts |
| --- | --- |
| `an_empty_address_is_not_ready_rather_than_wrong` | Nothing typed yet is a state, not an error |
| `an_address_with_no_name_in_it_says_so` | |
| `no_parent_chosen_yet_is_its_own_state` | |
| `a_parent_that_is_not_there_is_refused_before_anything_runs` | |
| `an_existing_non_empty_destination_is_refused` | Criterion 3 |
| `an_existing_empty_destination_is_allowed_because_git_allows_it` | Criterion 1 — matching git's own rule rather than inventing a stricter one — and that `creates_destination` is false, so cancelling will not remove a folder the user made |
| `every_problem_says_something_specific` | Five distinct sentences, and the occupied-destination one promises nothing was changed |

### Reading git's progress

| Test | Asserts |
| --- | --- |
| `a_progress_line_carries_its_phase_and_its_percentage` | |
| `the_remote_prefix_is_gits_own_and_is_not_part_of_the_phase` | |
| `each_phase_git_reports_during_a_clone_is_recognised` | Enumerating, Compressing, Receiving, Resolving, Updating files |
| `a_line_with_no_percentage_still_carries_gits_words` | "working…" is worse than whatever git actually said |
| `a_number_that_is_not_a_percentage_is_not_read_as_one` | `(123/456)` is not a percentage, and neither is `101%` |
| `a_blank_line_is_not_progress` | |
| `the_same_step_reported_again_is_not_worth_an_event` | git rewrites its line hundreds of times a second; one event per write would flood the webview to say the same thing |

## Rust — `crates/spagitty-core/src/shell.rs`, 2 tests

Both clone a fixture repository over a local path, so they need no network and
still exercise a real `git clone`.

| Test | Asserts |
| --- | --- |
| `a_clone_produces_the_same_repository_git_clone_would` | Criterion 1: a repository exists at the destination and its HEAD is the source's HEAD |
| `a_clone_reports_progress_on_stderr_rather_than_running_silently` | Criterion 4's data half — without `--progress`, git writes nothing to a pipe and the screen would sit frozen for the whole clone |

## Frontend — `src/lib/clone/`, 35 tests

### `store.test.ts`, 23 tests

| Group | Asserts |
| --- | --- |
| Planning | The plan is recomputed as the address is typed; the exact destination is what the screen has (criterion 2); an occupied destination is refused with the core's own sentence (criterion 3); the reason shown is the core's rather than a second one; a plan a newer keystroke superseded is dropped; choosing a folder replans; a dismissed folder dialog changes nothing |
| Running | Starting remembers the token progress will carry; a refused plan cannot be started; git's progress arrives; progress from a superseded clone is ignored; a line with no percentage still carries git's words; a second clone is not started while one runs; a refusal from Rust does not leave the screen pretending a clone started |
| Finishing | A finished clone offers to open what it made; **it opens the path it was given rather than one it re-derived** (criterion 7); a failed open keeps the offer; a failure shows git's own message; **there is nothing to open after a failure, so no entry is added** (criterion 8); a cancellation is not reported as a failure, because the user asked for it; stopping asks Rust to let go (criterion 6's frontend half); cancelling replans, because the destination may have just been removed |
| The modal | Closing it does not touch a running clone — the modal is a view of the clone, not the clone itself |

### `CloneModal.test.ts`, 9 tests

| Test | Asserts |
| --- | --- |
| `is not in the document until it is opened` | |
| `shows the exact path the clone will land at` | Criterion 2, on screen |
| `cannot start until there is a destination and nothing wrong with it` | |
| `shows the reason a refused plan was refused` | |
| `starts the clone and then offers to stop it` | The progress bar appears and Clone becomes Stop |
| `shows the phase and the percentage git reported` | Criterion 4 — the bar's width is the percentage git gave |
| `offers to open what was cloned once it finishes` | |
| `says Spagitty never asks for a password itself` | Criterion 5's honest half: credentials come from a helper, or the clone fails with git's message |
| `closes on Escape without stopping anything` | |

### `api.test.ts`, 3 tests

The wire contract for `clone_plan`, `clone_start` and `clone_release` — command
names and argument keys, which are strings on both sides and silent at compile
time when they drift.

## Not covered by automated tests

- **A clone of a public URL** (criterion 1's other half) needs a network. The
  local-path clone above proves the mechanism; SWEEP-1L-01 proves the transport.
- **Progress advancing visibly for a large repository** (criterion 4) needs a
  repository large enough to take time. SWEEP-1L-05.
- **A repository needing credentials no helper can supply** (criterion 5) needs
  a private URL and a machine with no helper configured. SWEEP-1L-10.
- **Cancelling, and what it removes** (criterion 6) is the worker's, which no
  automated test reaches. Both halves — the created directory removed, a
  pre-existing one untouched — are SWEEP-1L-06 and SWEEP-1L-07.
- **The graph painting the clone after it is opened** (criterion 7) is
  navigation through the app shell; SWEEP-1L-04.
