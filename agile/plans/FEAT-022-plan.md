<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-022 — Plan

## Context

The graph drew history and offered no verbs. The reference this was measured
against is `docs/reference/gitkraken-commit-graph.md`, kept in the repository so
the target does not live in someone's downloads folder.

Two constraints shaped every decision below.

**The graph is the app's most performance-sensitive surface.** It is
virtualized, it repaints a canvas on every scroll frame, and it is the screen
people leave open. Anything that costs a round trip per row, per hover, or per
frame is disqualified regardless of how good it looks.

**The row buffer is index-addressed and is the contract between the rows and
the canvas.** Both position by `index × pitch` from one value. Anything that
inserts, removes or renumbers rows breaks that alignment, so nothing does.

## Architecture decisions

### 1. One store per concern, none of them owning the rows

`store.svelte.ts` owns the walk and the buffer. Everything added here is a
separate `$state`-backed store that answers one question — `visibility` (what
the walk roots at), `columns` (the table), `selection` (the multi-select),
`overlay` (WIP and stashes), `scale` (zoom and text size) — and none of them
holds a row.

*Alternative rejected:* one graph store with all of it. It was the smaller diff
and it makes every hover invalidate every consumer, because a Svelte 5 store is
a reactivity boundary. Splitting means resizing a column does not repaint lanes.

### 2. Two selections, deliberately

`graph.selectedIndex` is the row the detail panel shows; `selection` is the set
an operation acts on. Collapsing them would mean arrowing down changes what a
menu would do, or ctrl-clicking a second row replaces the detail panel.
Reasoning kept at the top of `selection.svelte.ts`.

### 3. Hover is answered from loaded rows, never from git

`highlight.ts` is pure functions over a row accessor. A `merge-base` per hover
would be a subprocess on mouse movement. The cost is that an answer stops at the
end of the walk — which is the honest answer, since a highlight cannot mean
anything about rows that are not on screen.

### 4. Visibility changes the walk, not the rendering

Hide, solo, smart and pin all resolve to a **root set** handed to a new walk in
`gitlumiere-core`, whose token the store adopts. Filtering client-side would leave
lanes drawing edges between commits that are no longer parent and child.

The exception is the author filter, which **dims**: on the graph the shape is
the thing being looked at, so removing rows would lie about the history.

### 5. WIP and stashes are an overlay, not rows

Inserting a stash into the buffer renumbers every row below it on every stash
push. The WIP node lives in its own strip above row zero; a stash is drawn
beside the commit it was made on. Reasoning kept in `overlay.svelte.ts`.

### 6. The palette is a registry, not a list

`registerCommands()` contributes the shell's commands. A screen contributes its
own. The alternative — one file naming every feature — has to import every
feature to name it.

### 7. Git writes go through one shell layer

`ops.rs` over the extended `shell.rs`, not a second git binding. Every operation
is one function returning a typed result, and interactive rebase runs through
`GIT_SEQUENCE_EDITOR` rather than a reimplementation of the todo list.

## Files

**Rust.** `crates/gitlumiere-core/src/ops.rs` (new: reset, revert, cherry-pick,
merge, rebase, tags, branch rename and delete, detached checkout, stash
apply/pop/drop, fetch, push); `shell.rs`, `graph.rs` (`tips_for`,
`LaneState::reserve`, `walk_pinned`), `repo.rs`, `rebase.rs`, `lib.rs`;
`src-tauri/src/commands.rs`, `graph_worker.rs`, `lib.rs` (16 new commands).

**Frontend, new.** `graph/actions.ts`, `columns.svelte.ts`, `highlight.ts`,
`overlay.svelte.ts`, `selection.svelte.ts`, `visibility.svelte.ts`,
`GraphHeader.svelte`, `avatar.ts`; `palette/Palette.svelte`, `store.svelte.ts`,
`commands.ts`; `scale.svelte.ts`; `ui/Dialog.svelte`, `Menu.svelte`,
`Notice.svelte`, `dialog.svelte.ts`, `menu.ts`, `notice.svelte.ts`.

**Frontend, changed.** `graph/CommitRows.svelte`, `LaneCanvas.svelte`,
`lanes.ts`, `store.svelte.ts`; `metrics.ts`; `api.ts`; `types.ts`; `app.css`;
`ui/Btn.svelte`; `settings/AppearanceSection.svelte`; `routes/+layout.svelte`,
`+page.svelte`.

## Steps, in order

1. Rust operations and the extended shell layer, with their tests.
2. Root-set walks: `tips_for`, `reserve`, `walk_pinned`.
3. Tauri commands and the typed `api.ts` surface.
4. The stores: visibility, columns, selection, overlay, scale.
5. `Dialog`, `Notice`, `Menu`, and `actions.ts` on top of them.
6. Row interactions: menus, drag and drop, multi-select, hover.
7. `GraphHeader`, the visibility gear on the graph screen.
8. The palette and its registry.
9. Lane geometry retuned against the reference.
10. Records and docs.

## Risks

| Risk | Mitigation |
| --- | --- |
| A destructive operation runs without confirmation | Every one goes through `dialog.ask`; `Dialog` is mounted by the shell, not by a screen, so an action that outlives navigation still has its question on screen |
| Rows and lanes drift apart | Both derive from `scale.pitch`; the row pitch is asserted against Rust's at boot, and lane column widths are rounded to whole pixels |
| Stale indices after a rewrite | The multi-select clears on re-walk rather than following commits that no longer exist under those ids |
| Visibility state hides work and is forgotten | The header chip always names the current scope, and the gear lists what is hidden, soloed and pinned with a way back |
| Retuned geometry regresses on wide histories | Lane count is adaptive and capped at 12, and the tests assert geometry through the constants rather than against literals |

## Rollback

Every piece is additive and reachable from its own module. Reverting the branch
restores the read-only graph; no schema, no migration, and nothing persisted
outside `localStorage` keys namespaced under `gitlumiere.graph.*`.
