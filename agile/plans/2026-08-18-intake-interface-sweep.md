<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# Intake — interface sweep and the three deferred subsystems

**Date:** 2026-08-18
**Author of the request:** the project author, as 19 numbered points.
**Status:** Plan only. Nothing in this document has been implemented.

## What this document is

An intake and triage document, not an implementation plan under Amendment 12.
It turns 19 loose requests into work items, says which existing item each one
already belongs to, and records the conflicts and open questions found while
reading the code. Each item below still gets its own `agile/items/`,
`agile/plans/` and `agile/testing/` triplet, and its own branch under
Amendment 13, when it is actually started.

## Findings that change the shape of the work

These were discovered by reading the code, and three of them contradict what
the screens currently say about themselves.

1. **Rebase execution already exists in the backend.** `shell::rebase_interactive`
   (`crates/gitlumiere-core/src/shell.rs:545`) is fully implemented — it drives
   `git rebase -i` through `GIT_SEQUENCE_EDITOR`. `commands::rebase_run`
   (`src-tauri/src/commands.rs:408`) and `api.rebaseRun` both exist. FEAT-015 is
   *not* an unbuilt subsystem; it is an unwired button plus the surrounding
   safety and progress work. The FEAT-015 item document says otherwise and is
   stale under Amendment 11.
2. **Stash pop / apply / drop already exist end to end.** `shell::stash_pop`,
   `stash_apply`, `stash_drop`, `commands::stash_action`, `api.stashAction` and
   `actions.stash()` — which already writes the confirmation dialog — are all
   present. Only `StashDetail.svelte` still renders dead chips. FEAT-014 is UI
   wiring, an hour of work, not a feature.
3. **Conflict resolution genuinely has no backend.** No write path exists:
   `commands.rs` exposes `conflicts` and `conflict_sides` and nothing else.
   FEAT-016 is real work.
4. **Forge integration genuinely has no backend.** No HTTP client is linked in
   either language. FEAT-017 is real work and carries author-owned questions.
5. **The uncommitted-changes row is already dead code.** `CommitRows.svelte`
   accepts an `onwip` prop; `src/routes/+page.svelte` never passes it. Clicking
   the row does nothing at all today.
6. **macOS is a shipped target.** `gates.yml` and `prerelease.yml` both build on
   `macos-latest`. This conflicts with request 18 as written — see the conflict
   note under TASK-007.

## The work items

### TASK-006 — Hover and pointer affordance system
*Covers request 1.*

**Problem.** Hover states were written per component and are missing from about
half of them. An audit of every file containing a click handler found zero
`:hover` rules in `Menu.svelte`, `Dialog.svelte`, `Palette.svelte`,
`TodoList.svelte`, `RepoCard.svelte`, `RequestRow.svelte`, `QueryBar.svelte`,
`ConflictPager.svelte`, `StashDetail.svelte`, `ResultDetail.svelte`,
`HunkPane.svelte`, `MessageBox.svelte`, `IdentitySection.svelte` and
`BehaviourSection.svelte`.

**Approach.** Not 40 more ad-hoc rules. Three hover *roles* declared once in
`src/app.css`, applied by class, so "what hover looks like" stays one decision
(Amendment 7):

- `--hover-surface` — a row, card or list entry: fill with `var(--stripe)`.
- `--hover-control` — a button, chip or field: border to `var(--accent)`, ink to
  `var(--accent)`.
- `--hover-quiet` — a glyph or icon-only control: ink from `var(--dim)` to
  `var(--ink)`.

Each is a token plus a utility class (`.hoverable-surface`, `.hoverable-control`,
`.hoverable-quiet`). Existing bespoke rules in `Btn.svelte`, `Chip.svelte`,
`NavRail.svelte`, `RepoTabs.svelte`, `CommandLog.svelte` and `GraphHeader.svelte`
are folded into the tokens rather than left as a second definition.

**Rules that come with it.**
- Every interactive element gets a hover state *and* `cursor: pointer`.
- Disabled controls get neither — `:hover:not(:disabled)` throughout.
- Transitions are `120ms ease`, and are dropped under
  `prefers-reduced-motion: reduce` alongside the existing `.glow` handling.

**Files.** `src/app.css`, and every `.svelte` in the audit list above.

**Risk.** Low. Purely additive CSS; the one thing to watch is `.glow`, whose
border *is* its animation — the `:not(.glow)` exclusions in `Btn.svelte` must
survive the refactor.

---

### TASK-007 — Copy sweep: drop the hand-holding, drop the Mac notation
*Covers requests 5, 7, 10, 12 (first half), 13, 16, 18.*

**Problem.** Screens narrate their own limitations in footer prose. The author's
objection is that it reads as talking down to the user.

**The rule to apply.** A footer sentence stays only if it carries information the
user cannot see on the screen. It goes if it explains what a button obviously
does, or announces that the application does nothing.

**Removals, exact and exhaustive:**

| File | Line | Text |
| --- | --- | --- |
| `src/routes/changes/+page.svelte` | 99 | "Nothing is committed until you press the button." |
| `src/routes/branches/+page.svelte` | 132 | "Ahead and behind are counted against the last fetch. Nothing on this screen talks to a network." |
| `src/routes/stash/+page.svelte` | 87 | "Stashing takes your changes out of the working copy and keeps them here. Bringing them back is not built yet." |
| `src/routes/search/+page.svelte` | 99 | "↵ opens the commit · ⌥↵ opens its diff. Text filters are plain substrings…" |
| `src/routes/rebase/+page.svelte` | 90 | "Nothing runs until FEAT-015 builds the Apply button." |
| `src/routes/settings/+page.svelte` | 80 | "The identity is git's own configuration and is written with git config…" |

Error branches in those same footers (`writeError`, `error`) are kept — they are
the case where the footer is the only place the failure appears. Where removing
the only non-error branch empties the footer, the footer element goes with it
rather than leaving a bordered empty strip.

**Mac notation, exact:**

| File | Line | Now | After |
| --- | --- | --- | --- |
| `src/lib/nav.ts` | 65 | Branches glyph `⌥` | a non-key glyph, e.g. `⑂` |
| `src/lib/nav.ts` | 68 | Log hint `⌘F` | `Ctrl+F` |
| `src/lib/chrome/NavRail.svelte` | 66 | `⌘F` | removed with the filter field (FEAT-030) |
| `src/lib/search/ResultRows.svelte` | 20 | `⌥↵` in a doc comment | `Alt+Enter` |
| `src/lib/search/ResultDetail.svelte` | 12 | `⌥↵` in a doc comment | `Alt+Enter` |
| `src/lib/rebase/TodoList.svelte` | 51 | title "⌥↑ / ⌥↓" | "Alt+↑ / Alt+↓" |
| `src/routes/+layout.svelte` | 118 | `⌘F` in a doc comment | `Ctrl+F` |
| `src/routes/search/+page.svelte` | 21, 44 | `⌘F`, `⌥↵` in doc comments | `Ctrl+F`, `Alt+Enter` |

`src/lib/rebase/panes.test.ts:241` asserts the title contains `⌥` and updates
with it.

> **Conflict, Amendment 2 — needs the author's decision.** `src/lib/palette/commands.ts:30`
> picks `⌘` or `Ctrl+` from `navigator.platform`. On Linux it already renders
> `Ctrl+`, so it is not a Mac reference on this machine. But CI builds and
> pre-releases macOS (`gates.yml`, `prerelease.yml`), so deleting the branch
> would print `Ctrl+` on a platform where that key does not exist. **Recommended:
> keep this one conditional, remove every hardcoded glyph above.** Say the word
> and the conditional goes too.
>
> `⇧` and `⇩` in `Toolbar.svelte` are up- and down-arrows for Push and Fetch,
> not the Shift key. Left alone.

**Also here, from request 17:** rename the Settings *Advanced* section to
**License**. `SECTIONS` in `src/lib/settings/store.svelte.ts:23` and the heading
in `AdvancedSection.svelte:32`. The section is already nothing but version,
build, project licence and dependency licences, so the name is simply wrong
today. The id changes `advanced` → `license`, and `showFromHash` keeps accepting
`#advanced` so an old link still lands somewhere sane. The file is renamed to
`LicenseSection.svelte` by `git mv` — nothing is deleted (Amendment 6).

---

### FEAT-030 — The rail: the open-repository slot, and Log's place in the order
*Covers requests 12 (second half) and 19.*

1. **Remove the "filter commits / ⌘F" field** at the top of `NavRail.svelte`
   (lines 57–71 plus the `.filter` and `.field` styles). It duplicates the Log
   screen's own query bar and the `Ctrl+F` shortcut in `+layout.svelte`.
2. **Lift "Open repository…" into that slot.** It currently sits in `.foot`
   below a spacer, which is the least discoverable place in the rail for the
   action a new user needs first. It becomes the top control, styled as the
   primary action it is. Collapsed, the `⊞` glyph moves with it.
3. **The foot keeps** the "Tags N · Submodules N" line, now alone.
4. **Reorder `NAV_ITEMS`** so Log follows Rebase: Graph, Working copy,
   Conflicts, Branches, Stash, Pull requests, **Rebase, Log**, divider, All
   repositories, Settings.

**Files.** `src/lib/nav.ts`, `src/lib/chrome/NavRail.svelte`,
`src/lib/chrome/chrome.test.ts` (order assertions), `docs/screens.md`.

---

### FEAT-031 — The graph: selectable refs, and a live uncommitted-changes row
*Covers requests 2 and 4.*

**Request 2 — the branch tag is the selectable thing, not the whole row.**
Today `.chip-slot` in `CommitRows.svelte` is draggable and right-clickable but a
plain click on it falls through to the row handler, which selects the commit.
Planned behaviour:

- A click on a ref chip selects **that ref**, stops propagating, and leaves the
  commit selection where it was.
- A selected ref gets its own visual state on the chip — accent ring, not a row
  fill — held in a small `refSelection` rune beside `selection.svelte.ts`.
- Selecting a ref is what the drag-to-integrate and the ref menu act on, so the
  chip becomes a real focusable control: `tabindex="0"`, arrow-key reachable,
  `aria-pressed`.
- Double-click keeps its current meaning (check out the branch).

> **Open question, Amendment 2.** Request 2 admits a second reading: that the
> *row highlight* should stop spanning the full width and instead paint only the
> chip. The plan above is the first reading — clicking a chip acts on the ref
> rather than the commit. Confirm before this one is built.

**Request 4 — the uncommitted-changes row.**

- **It is dead today.** `CommitRows.svelte` takes an `onwip` prop that
  `src/routes/+page.svelte` never passes. Wire it: `onwip={() => goto('/changes')}`.
- **Right-click menu** on the same row, built the way every other menu here is
  built — a `MenuItem[]` fed to `Menu.svelte`, actions living in `actions.ts`:
  - *Open the working copy* — same as the click.
  - *Stash these changes…* — `dialog.prompt` for the message, an "include
    untracked" default taken from the Stash screen's own toggle, then
    `api.stashPush`. New `actions.stashWorking()`.
  - *Create a branch here…* — `dialog.prompt` for the name, then
    `api.createBranch(name, 'HEAD', true)`. The uncommitted changes follow the
    checkout, which is what the user means by "make branch". New
    `actions.branchFromWorking()`.
  - Both refresh through the existing `perform()` helper, so notices and the
    re-read come free.
- The row gets `role="button"`, a keyboard path, and TASK-006's hover role.

**Files.** `src/lib/graph/CommitRows.svelte`, `src/lib/graph/actions.ts`,
`src/routes/+page.svelte`, new `src/lib/graph/refSelection.svelte.ts`, tests in
`src/lib/graph/rows.test.ts`.

---

### FEAT-032 — Beam portraits
*Covers request 3.*

**Now.** `src/lib/graph/portrait.ts` is Boring Avatars' *marble* rebuilt in
house — a base fill and three soft radial blobs, drawn twice: as CSS gradients
for the author column and onto a canvas for the graph nodes.

**Wanted.** Boring Avatars' *beam* — the face: a solid background square, a
face group offset and rotated from the hash, two eyes and a mouth that is either
a smile or a flat line.

**Approach.** Same architecture, new geometry. The value type `Portrait` becomes
a `Beam` — `{ background, translateX, translateY, rotate, scale, eyeSpread,
mouthSpread, isSmiling, faceColor }`, every field sliced out of the same FNV-1a
hash, and every colour still an index into the lane cycle so no new hue enters a
theme. Not a dependency: the library ships React components and its own palette;
what is wanted is eight numbers.

**The renderer question is the real work.** A beam is strokes and arcs, not
gradients. The CSS-gradient path in `portraitBackground()` cannot draw a mouth.
So:

- `drawBeam(ctx, seed, size, colors)` for the canvas — straightforward.
- The author column swaps from a `background:` string to a small inline `<svg>`
  built from the same description. That is the honest renderer for this shape,
  and it keeps the "one geometry, two renderers" property the file's own doc
  comment argues for.
- `portraitTile` caching, `forgetPortraits` on theme change and the 512-entry
  bound are unchanged.

**Risk.** A face at 18px on a lane node is the thing to check. If a beam is
illegible at node size, the fallback is beams in the author column and marble on
the nodes — but that breaks the one-face-per-person guarantee, so it needs the
author's call rather than a quiet decision.

**Files.** `src/lib/graph/portrait.ts` → `beam.ts` (`git mv`),
`src/lib/graph/portrait.test.ts`, `src/lib/graph/lanes.ts`,
`src/lib/graph/CommitRows.svelte`, `src/lib/graph/CommitDetail.svelte`.

---

### FEAT-033 — The branches table: resizable columns, and a divergence worth reading
*Covers request 8.*

**Resizable columns.** The graph already has exactly this machinery in
`src/lib/graph/columns.svelte.ts` — order, per-column widths, minimums, a
filling column, `localStorage` per repository — driven by `Splitter.svelte` and
`GraphHeader.svelte`. `BranchTable.svelte` instead hardcodes
`grid-template-columns: minmax(0,1fr) 90px 220px 210px`.

**Approach.** Extract the generic half of `columns.svelte.ts` into
`src/lib/ui/columns.svelte.ts`, parameterised by a catalogue, a default order
and a storage key. The graph store becomes a thin adapter that adds its one
special case (the graph column's width is computed from lane count, not
dragged). The branch table becomes the second consumer, with catalogue
`branch | drift | when | actions`.

> **Risk, and it is a real one.** The graph's column widths are what BUG-003 was
> about: the lane canvas mirrors the row's columns so the two cannot drift.
> Anything touching that store must keep the `.lane-layer` spacer-per-column
> arrangement in `CommitRows.svelte` intact. A regression test that asserts the
> canvas slot's offset equals the sum of the preceding column widths goes in
> *before* the extraction (Amendment 9's spirit: make it structurally unable to
> come back).

**Ahead / behind, redone.** Today: `↑2 ↓3` in a 90px right-aligned mono cell,
`—` when there is no upstream, the word `level` when equal. The author's verdict
is "awful". Proposed replacement — a **divergence bar**: a fixed-width two-sided
bar with the branch's own position at the centre, a segment left for behind and
right for ahead, each scaled against the widest divergence on screen, the two
numbers inside or beside the segments, the whole thing coloured with the
existing lane palette (behind muted, ahead accent). Four states, each visually
distinct at a glance:

- *no upstream* — the bar is absent, not a dash.
- *level* — a single centre tick.
- *ahead only* / *behind only* — one segment.
- *both* — both, which is the case the current text handles worst.

> **Author-owned, Amendment 8.** This is a taste decision with no objectively
> right answer. The bar is the recommendation; the alternative is a plain
> two-column split (`ahead` and `behind` as separate sortable numeric columns,
> which resizing makes newly practical). Pick one before it is built.

**Files.** new `src/lib/ui/columns.svelte.ts`, `src/lib/graph/columns.svelte.ts`,
`src/lib/branches/BranchTable.svelte`, new `src/lib/branches/Divergence.svelte`,
`src/lib/branches/BranchTable.test.ts`, `src/lib/graph/columns.test.ts`.

---

### FEAT-034 — Stash: browse the files, and restore them
*Covers requests 9 and 10.*

**Request 9 — browse the stashed files.** `StashDetail.svelte` already lists
every path in the entry (it reads `commitDiff` on the stash's own commit id), but
the paths are inert `<div>`s. Clicking one does nothing; the only way to see
content is "Open full diff →", which leaves the screen.

**Approach.** The Stash screen becomes list / files / hunks, mirroring the
Working copy screen's own three-pane shape rather than inventing a fourth
layout:

- The file list becomes buttons with selection state, keyboard navigation and
  the same status glyphs.
- A third pane shows the selected file's hunks, read with `api.fileDiff(entry.id,
  path)` — the same call the Diff screen makes, so there is no second
  implementation.
- `Splitter.svelte` between the panes, widths persisted like every other panel.
- "Open full diff →" stays, for when the whole entry is wanted.

**Request 10 — remove "Bringing them back is not built yet".** The honest fix is
that it *is* built: `actions.stash(index, name, action)` already writes the
confirmation and calls `api.stashAction`, and the whole Rust path exists. So the
line goes **and** the three dead chips in `StashDetail.svelte` are wired to Pop,
Apply and Drop. This closes FEAT-014, whose item document is stale.

**Files.** `src/lib/stash/StashDetail.svelte`, new
`src/lib/stash/StashHunks.svelte`, `src/lib/stash/store.svelte.ts`,
`src/routes/stash/+page.svelte`, `src/lib/stash/panes.test.ts`, and
`agile/items/FEAT-014-stash-pop-apply-drop.md` marked done.

---

### BUG-006 — All repositories: overlapping text
*Covers request 15.*

**Status: cannot be planned properly yet.** The author has a screenshot; it has
not been provided, and Amendment 4 keeps me from launching the app to reproduce
it without the wheel.

**What reading the code suggests.** In `RepoCard.svelte` the card is a fixed
`var(--repo-card-w)` wide and several children are `white-space: nowrap` with
`text-overflow: ellipsis` — `.name`, `.path`, `.last`. Those ellipsis correctly
only when every ancestor down the chain has `min-width: 0`. `.top` has it;
`.branch` has it; the card itself does not. A `RefChip` with a long branch name
inside `.branch` has no `min-width: 0` of its own and no ellipsis rule, so it is
the most likely thing to push a sibling out of its box. `.path` also sets
`direction: rtl`, which is the other classic source of visual overlap when a
path contains bidirectional characters.

**Plan.** Ask for the screenshot, or take the wheel to reproduce on Xvfb, then
fix at the identified element and add a width-constrained rendering test. Not
guessed at before then — the wrong fix here is invisible.

---

### FEAT-015 — Rebase execution
*Covers request 14 — "let's plan it".*

**The item document is stale.** It says `shell::rebase_interactive` is an
`unimplemented!()` stub. It is not: it is complete, and `commands::rebase_run`
and `api.rebaseRun` exist. Correcting that document is step one (Amendment 11).

**What is actually left.**

1. **Enable Apply** in `src/routes/rebase/+page.svelte:70`, gated on a loaded,
   non-empty plan.
2. **The confirmation.** `dialog.confirm` naming the branch, the commit count,
   the upstream and the 30-day reflog window — the wording `actions.ts` already
   uses for history rewrites, honouring `settings.confirmHistoryRewrite`.
3. **Progress.** `rebase_run` is synchronous today and will block the webview
   for the length of the rebase. It moves to a worker with an event stream, the
   way `graph_worker.rs`, `search_worker.rs` and `clone_worker.rs` already do —
   that pattern is the project's answer to this exact problem and there is no
   case for a fourth shape.
4. **Stopping at a conflict.** Detect the stop, route to the Conflicts screen,
   and offer *continue* once resolved. **This is the hard dependency on
   FEAT-016** — without resolution writes, a rebase that stops mid-way strands
   the user in the UI.
5. **Abort and undo.** `git rebase --abort`, and `reset --hard ORIG_HEAD` for
   the finished-but-regretted case, behind the confirmation destructive
   operations already get.
6. **Interrupted state.** GitLumiere closing mid-rebase must leave a repository
   the command line can finish. Nothing in the on-disk rebase state is
   reimplemented.
7. Remove the two "FEAT-015" strings — the disabled title and the empty-state
   line (request 13 removes the second one immediately, in TASK-007).

**Order.** FEAT-016 first, then FEAT-015 steps 1–3 and 5–7, then step 4.

---

### FEAT-016 — Conflict resolution writes
*Covers request 6 — "let's plan to do this".*

**Genuinely unbuilt.** `commands.rs` exposes only `conflicts` and
`conflict_sides`. Everything below is new.

**Backend, `crates/gitlumiere-core/src/`:**
- `shell::checkout_ours(repo, path)` / `checkout_theirs` — `git checkout --ours|--theirs -- <path>`.
- `shell::add(repo, paths)` — marking resolved. The three index stages
  disappearing is the only real proof resolution worked, so it is checked after,
  not assumed.
- `shell::write_merged(repo, path, contents)` — the edited middle pane, written
  through a temp file and rename so a crash cannot truncate the user's file.
- `shell::continue_operation(repo, kind)` — `merge|rebase|cherry-pick --continue`.
- `shell::abort_operation(repo, kind)` — the matching `--abort`. The screen
  already knows which operation is in progress.
- Per-region take-ours / take-theirs is computed in Rust from the conflict
  markers, not in the webview — the same argument `rebase_run` makes about plans
  the repository never produced.

**Frontend:**
- `SidePane.svelte` gains a *Take this side* action per file and per region.
- The merged pane becomes editable, with a dirty state, a save, and a guard on
  leaving the screen with unsaved edits.
- *Mark resolved* enables when a file has no markers left.
- *Continue* enables when nothing is conflicted.
- *Abort* behind a confirmation naming what returns to what — `ORIG_HEAD` or the
  reflog, whichever applies to the operation in progress.

**Risk.** This is the operation where a wrong click is hardest to notice,
because either result looks plausible. Every write is confirmed, every write is
reversible from the reflog, and the confirmation says which.

**Tests.** Fixture repositories in a conflicted state for each operation kind —
`fixture.rs` already builds repositories, so this extends it rather than
inventing a harness.

---

### FEAT-017 — Forge integration
*Covers request 11 — "let's plan this".*

**Blocked on the author, not on engineering.** The existing item already carries
three questions and none has been answered. They cannot be defaulted:

1. **Which hosts, in what order?** GitHub, GitLab, Gitea, Bitbucket — the APIs
   are incompatible and the answer sets the whole shape.
2. **Direct HTTP, or reuse an authenticated host CLI?** Shelling out to `gh` /
   `glab` avoids storing a token at all, which fits how `shell.rs` already
   works. Talking HTTP means a client, a keychain integration, rate limiting and
   a new failure class. **The CLI route is the recommendation** — it is
   consistent with the project's "git does the work" architecture and it keeps
   the promise on the All repositories screen that nothing leaves the machine
   except through a tool the user already authenticated.
3. **Read-only, or writes too?** Approving and merging from GitLumiere is a
   different risk surface from reading.

**What can be planned regardless:**
- The read shape is already fixed — `src/lib/types.ts:237` defines FEAT-017's
  contract and `requests/store.svelte.ts` has the setter waiting.
- Connecting an account belongs in Settings → Accounts, which exists and
  connects nothing.
- Offline and rate-limited states must say which they are, not merge into one
  "unavailable".
- The privacy promise holds: no repository content leaves the machine, ever.

**Removed immediately, in TASK-007:** "Nothing in this application talks to a
network today. Connecting an account is FEAT-017." from
`src/routes/requests/+page.svelte:52`. The empty state's first two sentences —
no account connected, connect one in Settings — stay, because they are true and
actionable.

## Suggested order

| # | Item | Why here |
| --- | --- | --- |
| 1 | TASK-007 | Text only, no logic, no risk. Clears seven of the nineteen. |
| 2 | TASK-006 | Touches every screen; better before screens change under it. |
| 3 | FEAT-030 | Small, self-contained, immediately visible. |
| 4 | BUG-006 | Needs the screenshot; slot it in whenever that arrives. |
| 5 | FEAT-034 | Closes FEAT-014 as a side effect. |
| 6 | FEAT-031 | Graph interaction; independent of the rest. |
| 7 | FEAT-032 | Self-contained; the node-legibility check may reopen it. |
| 8 | FEAT-033 | Carries the BUG-003 regression risk; wants a clear run. |
| 9 | FEAT-016 | The real subsystem, and FEAT-015 depends on it. |
| 10 | FEAT-015 | Mostly wiring once FEAT-016 lands. |
| 11 | FEAT-017 | Blocked on the author's three answers. |

## Open questions for the author

1. **Request 2** — clicking a ref chip acts on the *ref* (recommended), or the
   row highlight shrinks to the chip?
2. **Request 8** — divergence bar (recommended), or two sortable numeric columns?
3. **Request 15** — the screenshot, or the wheel to reproduce it on Xvfb?
4. **Request 18** — does the `⌘`/`Ctrl+` conditional in `palette/commands.ts`
   stay, given macOS is a build target? (Recommended: it stays.)
5. **Request 3** — if a beam face is illegible at 18px node size, does the graph
   keep marble nodes, or do the nodes shrink to initials?
6. **FEAT-017** — the three questions above, unanswered since the item was
   written.

## Amendment compliance

- **12** — every item above gets its `items/`, `plans/`, `testing/` triplet
  before it is called done. This document is intake, not a substitute.
- **13** — one branch per item, cut from `dev`.
- **10** — the 70% floor applies; `columns.svelte.ts`, `beam.ts` and every new
  `shell.rs` function are exactly the logic that must be covered.
- **11** — `docs/screens.md` is rewritten by requests 5–19 and updated in the
  same change; `agile/items/FEAT-014` and `FEAT-015` are corrected as stale.
- **4** — nothing here is verified visually until the wheel is handed over.
