# Handoff: GitLord — open-source Git desktop client (GPL-3.0)

## Overview
**GitLord** is a cross-platform desktop Git GUI. The commit graph is the center of gravity; every other view is one focused task. Target audience spans CLI-averse beginners and power users doing history surgery, so the UI uses **standard git terminology** (fetch, push, stage, hunk, stash@{n}, pick/squash/reword/drop, ours/theirs) with no invented vocabulary.

Chosen stack (decided with the user): **Tauri 2 + Rust core + web UI**.

## About the design files
The files in this bundle are **design references created in HTML** — prototypes showing intended structure, information architecture, and behavior. They are **not production code to copy**. The task is to recreate them in the target environment (Tauri 2 + a TS frontend framework), using that project's own patterns.

`GitLord Shell.dc.html` is a streaming "Design Component" — a single HTML file with an inline `<style>` block, a template, and a small logic class. Treat the markup as a layout spec and the CSS custom properties as the token source; discard the DC runtime.

## Fidelity
**Low-fidelity (wireframe).** Layout, hierarchy, density, copy, and flow are decided. Grey bars (`.ph`) stand in for text, dashed boxes for secondary/empty content, and colored circles/lanes for the graph. Colors and type are placeholders — apply a real visual system when building, but keep:
- the 26px commit-row pitch and its three-column split (refs gutter / lanes / message),
- panel widths (rail 186, detail 270),
- the terminology exactly as written.

## Files
- `GitLord Shell.dc.html` — the approved, navigable app shell: 11 screens + clone modal, light/dark themes.
- `GitLord Wireframes.dc.html` — the full exploration (30 wireframes, 12 screens, 2–3 approaches each) plus a standalone graph study. Useful for alternates that were considered and rejected; ids referenced below (`1c`, `2a`, …) live here.

Approved options: graph column of `2a`, plus `1c`, `1g`, `1l`, `1m`, `1q`, `1s`, `1v`, `1w`, `1y`, `1aa`, `1ac`.

---

## Application chrome (persistent)

**Window:** 1280×800 reference size, min ~1024×640. Column layout:

| Region | Height / width | Contents |
| --- | --- | --- |
| Title bar | 30px | traffic lights, repo name, current-branch ref chip, theme toggle, `⌘K`, license/version |
| Toolbar | 50px | repo picker, branch picker, Undo/Redo, Fetch, Push (with count), Branch, Stash, Rebase, primary `Commit N files` |
| Body | fill | rail (186px) + screen (fill) + optional detail panel (270px) |

**Rail** (186px, panel background, 1.5px right border): commit-count header (`◂ 1181 / 1181`, "show all"), a filter field (`⌘F`), then nav items with right-aligned counts — Graph 1181, Working copy 6, Conflicts 3, Branches 132, Stash 3, Pull requests 93, Log, Rebase 6, divider, All repositories 7, Settings. Footer: "Tags 1049 · Submodules 2" and `Clone repository…`.

Active nav item: selection tint background, 3px accent left border, accent text.

---

## Screens

### 1. Graph (default) — from `2a`
**Purpose:** read history, select a commit, act on it.

Layout: header (title, current-branch chip, "all branches" chip, lanes/flat-list toggle) → three-column scroll body → footer hint row. Detail panel on the right.

- **Refs gutter, 186px:** right-aligned ref chips per row, monospace 10px, 1.5px border, 3px radius; current branch chip uses accent border+text with a `✔`; tags render with a right-notched radius (`3px 8px 8px 3px`) and dashed border; overflow collapses to a `+1` chip.
- **Lane column, 150px:** lanes at x = 18, 42, 66, 90, 114 (24px pitch), 2px stroke. Branch/merge transitions are cubic elbows spanning one row (26px). Node = filled circle r=8 with 2-letter author initials in 7px monospace, white text.
- **Message column, fill:** one 26px row per commit — message (single line, ellipsis), relative time right-aligned when notable. Rows alternate a 3.5% tint; hover tints; selected row uses the selection tint. Click opens the diff.
- **Footer:** "drag a commit onto a branch to merge · right-click for the full menu" / "click a row to open its diff".

**Detail panel:** header `commit` + short SHA with a download affordance; message block; author row (avatar, name, "authored · time"); committer row; `parent <sha>`; divider; "4 files changed" with path/tree toggle; file list with `+ ~ −` status glyphs; `Open full diff →`; divider; "Commit actions" chips — Merge into master, Revert, Interactive rebase, Copy SHA.

### 2. Diff — from `1g`
Full-window takeover. Header: `← Graph`, `Diff · <sha>`, `4 files · +48 −12`, unified/split toggle. Body: 210px file list (status glyph, name, per-file `+n −m`, selected row tinted) + divider + diff pane. Split view = two bordered columns labelled `before` / `after`; added lines accent-tinted, removed lines neutral-dark. Footer: Prev file / Next file (primary) and `1 of 4`. Hint: "j / k jumps between hunks. Esc goes back to the graph."

### 3. Working copy / Commit — from `1l`
Header: `Commit`, "6 files changed on master", select all / none.
- Message box on top: subject line, divider, body; helper "subject line, then optional body" and "2 files staged".
- 250px left column: **Staged (2)** as solid-bordered rows, **Unstaged (4)** as dashed rows, status glyphs `+ ~ − ?`, per-file `+n −m`; footer button "Stash all changes instead".
- Right pane: `src/auth/session.rs · hunk 1 of 3`, chips `stage hunk` / `unstage hunk`, hunk header `@@ 12,7 +12,9`, then diff lines.
- Footer: "nothing is committed until you press the button" + primary `Commit 2 files`.

### 4. Conflicts — from `1m`
Header: `Merge conflict`, file path, conflict pager chips (`conflict 1`, 2, 3), `Abort merge`.
Three equal panes: **Ours — HEAD** (with `Use this`), **Merged result · editable** (accent border, edit affordance), **Theirs — incoming** (with `Use this`).
Footer: "Nothing is committed until you finish. Your pre-merge state stays in the stash." + `Edit manually`, `Decide later`, primary `Next conflict →`.

### 5. Rebase — from `1q`
Header: `Interactive rebase`, "last 6 commits on feature/auth", Cancel / primary Apply.
Two columns: **Todo** (drag handle `⠿`, node, message, action chip `pick`/`squash`/`reword`/`drop`, short SHA; dropped rows dashed at 50% opacity; selected row tinted) and **Result preview** (recomputed list, changed commits accent-tinted, nothing executed yet). Footer: "6 → 4 commits · no other branch points at these" + "The reflog keeps the old history for 30 days — Undo in the toolbar restores it."

### 6. Branches — from `1s`
Header: `Branches`, "132 · 2 remotes", Manage remotes / primary New branch.
Filter field + chips (mine, origin, upstream, merged, stale). Column headers: branch | ahead / behind (90px) | last change (110px) | actions (150px). Rows: node, name, optional `current` chip, `2 ↑ 0 ↓`, relative time, action chips (Push/Rename, Switch/Pull, Switch/Pull request). Merged branches render dashed at 60% opacity with Delete. Footer: "4 branches are merged and safe to remove" + `Delete all 4`.

### 7. Stash — from `1v`
Header: `Stash`, "3 entries · stash@{0} … stash@{2}", primary `Stash changes`.
Graph-style body: 150px lane column where each stash entry hangs off its parent commit, message column marks entries with a `stash@{n}` ref chip. Footer explains the anchoring.
Detail panel: selected entry (tinted card: message, "2h ago · on master · 3 files · +40 −8"), actions `Pop` (primary), `Apply — keep in stash`, `Drop`; file list; hint "Popping restores the changes to the working copy, ready to commit."

### 8. Pull requests — from `1w`
Header: `Pull requests`, remote chips, primary `New pull request`.
Two groups: **Needs you (2)** — solid rows with `review` / `resolve` chips (the latter navigates to Conflicts); **Waiting on others (3)** — dashed rows with status (approvals, checks running, draft). Footer: host-agnostic note.
Detail panel: title, `feature/auth → master · opened 2d ago`, status chips (2 approvals / checks passed / no conflicts), 6-file list, conversation excerpt, merge-style chips (`squash merge` / `merge commit`), primary `Merge into master`.

### 9. Log search — from `1ac`
Header: `Log search`, result count, Save this search / Back to graph. Query field, removable filter chips (`author:`, `path:`, `message:`, date range, `+ add filter`). Results = graph-style rows (node, message, `sha · age`). Right 280px column: secondary lookups (file / person / branch) and a blame strip ("Blame — who last touched each line"). Hint: "↵ opens the commit · ⌥↵ opens its diff".

### 10. All repositories — from `1c`
Header: `Your repositories`, count, chips `needs attention 2` / `all`, primary `Clone repository…`.
300px cards in a wrapping grid: name, state chip (open / resolve / behind), path + branch, divider, status chips (`2 ahead`, `6 changed`, `3 conflicts`, `clean`). Idle repos render as dashed cards with a one-line status. Footer: "Repositories are read straight from disk. Nothing is uploaded anywhere."

### 11. Settings — from `1y`
Left 170px chip index (You, Accounts, Behaviour, Appearance, Advanced) + divider + 520px content column: Name, Email, then toggle rows — Sign my commits (on), Ask before rewriting history (on), Show the git command behind each action (off), Dark theme (bound to the live theme). Accounts section: connected host cards (`github.com · ssh key + token in OS keychain`, `git.company.internal · self-hosted`, token expiry chip) and `+ Add a host by URL`.

### 12. Clone modal — from `1aa`
480px centered dialog over a 35% scrim. Title `Clone repository` + close. Fields: **Repository URL** (protocol prefix, paste chip, helper "ssh, https or a local path all work"), **Local path** (field + Choose…). Progress block (dashed): "Cloning… 42%", `18 MB / 44 MB`, 8px accent progress bar. Footer: "Advanced (shallow, submodules) ▸", Cancel, primary `Clone`.

---

## Interactions & behavior
- Rail items switch screens; the active item is the only source of "where am I".
- Toolbar: Branch → Branches, Stash → Stash, Rebase → Rebase, primary button → Working copy.
- Graph: row click and detail-panel file click → Diff. Detail chips → Merge/Revert/Rebase.
- Pull requests `resolve` chip and repo card `resolve` chip → Conflicts.
- `Clone repository…` (rail + repos header) opens the modal; Cancel/Clone/✕ closes it.
- Theme toggle in the title bar and in Settings switches light/dark instantly (CSS variables only).
- Destructive/rewriting actions must be reversible: Undo in the toolbar maps to reflog restore; rebase shows a preview before executing; conflict resolution writes nothing until finished.
- Not yet specified: drag-and-drop merge, context menus, keyboard map beyond `⌘K` / `⌘F` / `j`/`k` / `Esc` / `↵` / `⌥↵`, loading and error states, empty states, responsive behavior below 1024px. Design these before implementing.

## State model (frontend)
```
screen: 'graph'|'diff'|'changes'|'conflict'|'rebase'|'branches'|'stash'|'requests'|'search'|'repos'|'settings'
theme: 'light'|'dark'
cloneModalOpen: boolean
```
Real implementation adds: openRepo, refs[], graph window (offset/limit + lane assignment), selectedCommit, workingCopy{staged[],unstaged[],selectedHunk}, conflictSession{files[],index}, rebaseTodo[], stashEntries[], pullRequests[], searchQuery+filters[], accounts[].

## Design tokens (wireframe placeholders — replace with the real system, keep the structure)
```
Light   bg #fff · panel #faf9f7 · ink #1a1a1a · muted rgba(0,0,0,.5)
        line rgba(0,0,0,.22) · soft rgba(0,0,0,.10) · placeholder rgba(0,0,0,.16)
        accent #2a78d6 · selection rgba(42,120,214,.10) · stripe rgba(0,0,0,.035)
Dark    bg #1b1e24 · panel #20242b · ink #e9e8e4 · muted rgba(255,255,255,.52)
        line rgba(255,255,255,.20) · soft rgba(255,255,255,.09) · placeholder rgba(255,255,255,.20)
        accent #5ba4ee · selection rgba(91,164,238,.14) · stripe rgba(255,255,255,.035)
Lanes   #2a78d6 #7a5cc4 #c0559b #c8862a #3f9d6a (cycle; stable per branch)
Spacing 3 4 6 8 10 14 16 · Radius 3 (fields/chips) 9 (pills) 12 (buttons) 50% (nodes)
Type    UI 13/1.35 · secondary 11 · mono 10 · screen title 16
Rows    commit row 26 · title bar 30 · toolbar 50 · rail 186 · detail 270 · lane pitch 24 · node r8
```
The wireframes use *Architects Daughter* deliberately to signal draft status — do not ship it.

## Implementation notes for Tauri 2 + Rust
- **Core:** `gix` (gitoxide, MIT/Apache — clean for a GPL-3 app) or `git2-rs`/libgit2 (GPL-2 with linking exception). Log walk, diff, staging, blame, rebase planning, stash all live in Rust.
- **Shell out to `git`** for exotic paths: interactive rebase execution, hooks, LFS, submodule recursion, credential helpers. Don't reimplement.
- **Graph performance:** compute lane assignment in Rust and stream commits to the UI (`tauri::Emitter` events) so the graph paints progressively. Virtualize the row list; render lanes to `<canvas>` (or one SVG for the visible window only) — never one DOM node per edge. Keep the 26px pitch as the single source of truth shared by rows and lane geometry.
- **Watch the repo** (`notify`) to refresh status/refs without polling.
- **Credentials** go in the OS keychain; the design promises nothing leaves the machine.
- **Licensing hygiene:** this is an original design. Do not copy any proprietary client's assets, icon set, exact strings, or layout chrome; keep third-party license notices in-app (Settings → Advanced) and ship the GPL-3.0 text.

## Naming, licensing & legal hygiene
- **Product name:** GitLord. **CLI binary:** `gitlord` — do **not** name it `git-lord`: git treats any `git-foo` executable on PATH as a subcommand, so `git lord` would start working by accident.
- **Bundle / app id:** something like `dev.gitlord.app`; window title "GitLord".
- **Trademark disclaimer** — put this in the README, the website footer, and Settings → About, verbatim or close:
  > GitLord is not affiliated with, endorsed by, or sponsored by the Git project or the Software Freedom Conservancy. Git and the Git logo are trademarks of the Software Freedom Conservancy.
  Never use the Git logo as GitLord's icon or in the app icon set.
- **Licensing files at the repo root, from the first commit:**
  - `LICENSE` — the full GPL-3.0-or-later text (unmodified).
  - `COPYING` optional alias, if you prefer GNU convention.
  - `NOTICE` / `THIRD-PARTY-LICENSES.md` — generated (e.g. `cargo-about` or `cargo-deny`) and refreshed in CI.
- **Per-file headers:** short SPDX line rather than the full boilerplate: `// SPDX-License-Identifier: GPL-3.0-or-later`. Set `license = "GPL-3.0-or-later"` in `Cargo.toml` and `"license": "GPL-3.0-or-later"` in `package.json`.
- **GPL-3 obligations to design for now, not later:** an in-app "About / Licenses" view (Settings → Advanced) listing GitLord's license and every dependency's; a link to the corresponding source for the exact build (embed the commit SHA in the build and show it in About).
- **Dependency compatibility:** `gix` (MIT/Apache-2.0) and `libgit2` (GPL-2.0 with linking exception) are both fine inside GPL-3. Watch out for anything Apache-2.0-only being linked *into* GPL-2-only code, and avoid proprietary or SSPL/BSL dependencies entirely.
- **Assets:** ship only assets you can relicense under GPL-3 — icon sets under MIT (Lucide, Phosphor) or a commissioned original mark. Fonts need their own license note (OFL is fine); state it in `NOTICE`.
- **Contributions:** add `CONTRIBUTING.md` stating contributions are accepted under GPL-3.0-or-later; a DCO sign-off (`git commit -s`) is lighter weight than a CLA and enough for most projects.

## Assets
None. All glyphs are Unicode text (`⇩ ⇧ ⑃ ▤ ✎ ↺ ↻ ⠿ ✔ ✕ ▾ ▸ ↑ ↓ + ~ − ?`) and all imagery is placeholder bars. Supply a real icon set (e.g. Lucide) when building.
