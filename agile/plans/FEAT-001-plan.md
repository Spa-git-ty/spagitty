<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-001 — Plan

**Written retroactively under TASK-001.** The implementation is what it
describes; the alternatives below are the ones the code's own comments record
having been weighed.

## Approach

Three layers, each ignorant of the one above it.

1. **`crates/gitlumiere-core`** — all git reading, via `gix`. No Tauri types, no
   window handles, no events. `graph::walk` produces `GraphRow` values, each
   carrying everything needed to paint that row with no global state: index,
   ids, summary, author, initials, time, lane, colour, parents, ref chips, and
   the lane edges in the band above it.
2. **`src-tauri`** — a thin command layer holding the open session, plus a
   worker thread that walks history and emits batches as `graph-rows` events,
   and a filesystem watcher that emits `repo-changed`.
3. **`src/`** — SvelteKit in SPA mode. One store per screen, one `api.ts` that
   is the only caller of `invoke`.

## Architecture decisions

**Streaming over a worker thread, not a blocking command.** A repository with a
hundred thousand commits cannot be returned as one value; a command that walks
it would block the webview for seconds. The worker owns the walk, the UI asks
for `count` more rows, and rows arrive as events. Each walk carries a token, so
rows from a superseded walk are dropped rather than interleaved.

*Alternative rejected:* paginated commands (`rows(offset, count)`). Every page
would restart the walk or hold a cursor across command calls, and the lane state
is inherently sequential — page 5 cannot be computed without pages 1 to 4.

**Lane state computed in Rust, not in the browser.** Lane assignment is a
sequential fold over the walk; doing it in JavaScript would mean shipping the
parent lists and recomputing on every render.

**One row pitch, defined twice on purpose, asserted equal.** Lane elbows are
described in row units in Rust, and the stylesheet needs the pitch in CSS
pixels. Rather than let the two drift, `ROW_PITCH` exists in
`crates/gitlumiere-core/src/graph.rs` and `src/lib/metrics.ts`, and the frontend
compares them at boot and logs an error if they disagree.

**Lane column capped at twelve.** Measured on `cli/cli`: twelve columns is where
the improvement curve knees while leaving the message column wider than the lane
column. The reasoning and the measurements are recorded in the doc comment on
`LANE_COLUMNS_MAX` in `src/lib/metrics.ts`.

## Files

- `crates/gitlumiere-core/src/{graph,refs,repo,status,error,shell}.rs`
- `src-tauri/src/{commands,graph_worker,watch,lib}.rs`
- `src/lib/graph/{store.svelte.ts,lanes.ts,CommitRows.svelte,LaneCanvas.svelte,CommitDetail.svelte}`
- `src/lib/chrome/{TitleBar,Toolbar,NavRail,ResizeEdges}.svelte`, `window.ts`
- `src/lib/{api,types,metrics,format,nav,panels.svelte,repo.svelte,theme.svelte,version}.ts`
- `src/routes/+layout.svelte`, `src/routes/+page.svelte`, and a `ScreenStub`
  route per unbuilt screen

## Risks

- A wrong lane fold is invisible until a repository with an unusual merge shape
  opens it. Mitigated by unit tests over `LaneState` covering linear history,
  branch-out, merge-in and lane reuse.
- The watcher can fire in a storm during a rebase. Mitigated by debouncing
  `repo-changed` before re-walking.

## Rollback

The commit is the repository's root; rollback is not meaningful.
