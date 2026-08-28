<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-003 — Plan

**Item:** [`agile/items/TASK-003-runtime-generic-tauri-layer.md`](../items/TASK-003-runtime-generic-tauri-layer.md)
**Branch:** `task/TASK-003-runtime-generic`
**Status:** implemented.

**Branch point.** Cut from `feature/FEAT-033-divergence-on-the-chip`, continuing
the unmerged stack.

## Approach

### The signature change, and nothing else

Every function in `src-tauri` that took `AppHandle` now takes `AppHandle<R>` and
carries `<R: tauri::Runtime>`. That is the whole behaviour-preserving half of
the item: ten files, sixty-four lines, no logic touched. The generic parameter
is inferred at every call site, and `lib.rs` — which names the concrete runtime
through `tauri::Builder::default()` and `generate_handler!` — did not have to
change at all. `generate_handler!` accepts a generic command as it stands.

It is worth saying that the commands went generic too, because it looks
optional: `open_repo` hands its handle to the graph worker and the watcher, so
the worker cannot be constructed under a mock runtime unless the command that
spawns it can be as well.

### Where the fixtures come from

`spagitty-core`'s fixtures were `#[cfg(test)] mod fixture`, private to that
crate's own tests. They are now `pub mod fixture` behind a `fixture` feature,
which `src-tauri` turns on as a **dev-dependency only**.

The alternative was a second fixture builder in `src-tauri`, and two things that
build a repository with the `git` binary is two things to keep honest. A release
build carries neither the fixtures nor `tempfile`, because nothing enables the
feature outside tests.

`Fixture::linear(n)` is new: a history of `n` empty commits. Everything the
graph worker does in batches needs a history longer than one batch, and what is
*in* those commits is beside the point — the walk reads the commit graph, not
the trees.

### Testing something that emits and never looks back

The workers discard every emit result on purpose: a dropped event costs latency
and nothing else. So there is no return value to assert on, and the tests watch
what came out instead. `src-tauri/src/testing.rs` holds the three pieces that
takes:

- `app()` — a mock-runtime application managing the same `AppState` the real one
  does.
- `Emitted<T>` — a listener that collects every payload on one event, with
  `at_least(n)` to wait for arrivals and `no_more_than(n)` to assert an absence
  after giving it time to appear. "And then it blocked" is an absence, and an
  absence has to be waited for or it proves nothing.
- `finishes_promptly` — runs a drop on another thread with a deadline. Dropping
  a worker joins its thread, so a worker that ignored `Stop` would **hang** the
  test runner rather than fail it. This turns that into a failure with a name.

### The configuration directory the tests must not touch

`open_repo` calls `recents::remember`, which writes through
`app_config_dir()` — and that resolves against the real user's home even under
the mock runtime. A test that opened a repository would leave a row in the list
of repositories the person running it had opened.

`testing.rs` points `HOME`, `XDG_CONFIG_HOME`, `APPDATA` and `LOCALAPPDATA` at a
temporary directory. The environment is process-wide, so it is set exactly once,
inside the `OnceLock` that creates the directory, before any test builds an app.

### Coverage excludes the scaffolding

`testing.rs` joins `fixture.rs` in the `--ignore-filename-regex`. Test
scaffolding that counts towards the coverage floor makes the floor mean less,
and it is the floor for first-party code that ships.

## What this found

Nothing. Every test written afterwards passed first time, which is the outcome
the item asked for — anything else was to be recorded as its own `BUG-###`.

## What was not done

- **`clone_worker`, `network_worker`, `rebase_worker` and `search_worker` are
  generic but untested.** Each spawns `git` and reads its stderr; testing them
  means a fixture that fetches, pushes or clones, which is FEAT-018's and
  FEAT-012's ground rather than this item's. The signature change unblocks them;
  it does not owe them.
- **`watch::watch` itself** — the `notify` half. The debounce loop it spawns is
  tested; the watcher registration is a call into `notify` and a platform
  question, not ours.
- **`settings` and `recents` against a real `AppHandle`.** Their parsing and
  ordering were already tested as pure functions, which is where the logic is.
