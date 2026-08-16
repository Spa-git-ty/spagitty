<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# Architecture

How GitLord is put together, and why. Screen-by-screen state lives in
[screens.md](screens.md); how to run and test it lives in
[testing.md](testing.md).

## Three layers

```
src/                    SvelteKit, SPA mode. One store per screen.
  └── invoke ─────────► src-tauri/           Tauri commands, worker, watcher.
                          └── calls ───────► crates/gitlord-core/   git, via gix.
```

Each layer knows nothing about the one above it.

### `crates/gitlord-core`

Every git operation. No Tauri types, no window handles, no events — the crate
compiles and is tested without a GUI, and its examples
(`examples/graph-dump.rs`, `examples/diff-dump.rs`) run it from a terminal.

| Module | Holds |
| --- | --- |
| `repo.rs` | Opening a repository, describing it, reading HEAD |
| `graph.rs` | The log walk, lane assignment, lane colours, edges, `ROW_PITCH` |
| `refs.rs` | `RefIndex` — commit id to the refs pointing at it |
| `branches.rs` | Branch rows: drift, upstream, merged; checkout and create |
| `diff.rs` | Commit detail, per-commit file lists, per-file hunks |
| `conflicts.rs` | Index stages 1/2/3 of a conflicted path, and what operation is in progress |
| `search.rs` | The filtered history walk behind Log search |
| `blame.rs` | Who last touched each line — the one read that goes through `git` |
| `stash.rs` | Stash entries, read from the reflog of `refs/stash` |
| `status.rs` | The working-copy status walk, and the counts the nav rail shows |
| `work.rs` | Changing the working copy: stage, unstage, commit |
| `error.rs` | `Error`, whose `Display` text is user-facing |
| `shell.rs` | The only module that spawns a process |

Types crossing to the frontend derive `Serialize` with
`#[serde(rename_all = "camelCase")]`, and are mirrored by hand in
`src/lib/types.ts`. The two are kept in step deliberately rather than generated,
because the wire shape is small and a generator would be more machinery than the
problem needs.

### `src-tauri`

Deliberately thin. It holds the open session — one repository at a time — and
forwards to the core.

| File | Holds |
| --- | --- |
| `commands.rs` | One `#[tauri::command]` per operation. No git logic. |
| `recents.rs` | The list of repositories the user has opened — application state, not git state |
| `graph_worker.rs` | A thread that walks history and emits batches |
| `search_worker.rs` | A thread per query; starting one cancels the one before |
| `watch.rs` | Filesystem watcher over the git directory |
| `lib.rs` | Command registration |

Commands registered today: `open_repo`, `close_repo`, `graph_request`,
`graph_restart`, `snapshot`, `commit_detail`, `commit_diff`, `file_diff`,
`working_copy`, `working_diff`, `stage`, `unstage`, `stage_hunk`,
`unstage_hunk`, `commit`, `head_message`, `branches`, `checkout`,
`create_branch`, `search_start`, `search_stop`, `blame`, `conflicts`,
`conflict_sides`, `stashes`, `stash_push`, `recent_repos`, `forget_repo`,
`metrics`, `about`, `launch_path`.

### `src`

SvelteKit in SPA mode — `ssr = false`, `prerender = false` in
`src/routes/+layout.ts`. Tauri serves a static bundle from disk; there is no
server.

- `src/lib/api.ts` is the **only** module that calls `invoke`. A command rename
  is a one-file change.
- One directory per screen under `src/lib/` — `graph/`, `diff/`, and one per
  screen as it is built — each with a `store.svelte.ts` and its components.
- `src/lib/chrome/` is the persistent frame: title bar, toolbar, nav rail,
  resize edges.
- Stores export a single object with getters, never the `$state` variables
  themselves, so a screen cannot write another screen's state by accident.

## Two things the layers share

**The row pitch is defined twice on purpose.** Lane elbows are described in row
units in `crates/gitlord-core/src/graph.rs`; the stylesheet needs the same
number in CSS pixels from `src/lib/metrics.ts`. Rather than let them drift, the
frontend fetches the Rust value at boot through the `metrics` command and logs
an error if they disagree.

**Structural numbers live in `src/lib/metrics.ts`** and are published as CSS
custom properties by `applyMetrics`. There is no `height: 26px` in any
component, and no second `26` anywhere in the frontend.

## The `git` binary boundary

`crates/gitlord-core/src/shell.rs` is the only module in the workspace that
spawns a process. Its header carries the full table and the reasoning; the rule
in one sentence:

> If the operation mutates state that the wider git ecosystem also reads, or
> delegates to something outside the repository, it shells out to `git`.
> Read-only history questions are answered in-process with `gix`.

So reads — log walking, refs, diffing, status, the index's conflict stages — are
`gix`. Interactive rebase execution, hooks, LFS, submodule recursion, credential
helpers, committing, staging, checkout and stash push are `git`. As further
screens land, clone joins the `git` side for the same reason, and the table in
that header is extended in the same change that adds it.

**One read breaks the rule, and it is written down rather than quietly done.**
`shell::blame` shells out because `gix::blame` 0.16 — the newest published
version — panics on an ordinary history shape rather than returning an error:
a file blamed at a merge commit whose history contains an intervening commit
that left the file alone. Every diff algorithm and both rename settings do it.
The exception carries an end condition: blame moves back in-process when the
upstream defect is fixed. It is the only read in the workspace that spawns a
process.

`gix` is MIT/Apache-2.0, which links cleanly into a GPL-3 program.

## Data flow: opening a repository

1. `repo.open(path)` calls `open_repo`.
2. Rust opens the repository, builds the `RefIndex`, computes the cheap counts,
   spawns a graph worker and a filesystem watcher, and returns
   `{ info, counts, token }`.
3. The worker does not walk anything yet. The graph store asks for rows with
   `graph_request(token, count)`.
4. Rows arrive as `graph-rows` events in batches; `graph-done` ends the walk.
5. Rows carrying a token other than the current one are dropped. That is how a
   superseded walk is discarded without cancellation races.
6. The watcher emits `repo-changed`. Refs moving debounces into a re-read and a
   re-walk; a worktree change re-reads the counts only.

## Errors

`Error` crosses to JavaScript as a plain string, so its `Display` text is user
facing — plain, specific, no stack-trace jargon. Screens show that string
directly rather than substituting a message of their own.

## Branching and releases

Git Flow, per Amendments 13 to 15: `main` and `dev` are protected, work happens
on `feature/`, `task/`, `bugfix/`, `hotfix/` and `release/` branches named after
their work item ID in `agile/`.

**Current deviation, recorded on purpose.** The repository has no remote yet.
No pull request can be opened, so nothing can legitimately reach `dev`, and a
branch cut from `dev` would lack the test configuration and core modules that
later items depend on. Branches therefore **stack**: each item is cut from the
previous item's branch, in item order. When a remote exists they merge into
`dev` by pull request in that same order.

CI is six ordered gates, described in [ci.md](ci.md). They have not run yet:
there is no remote to run them on.
