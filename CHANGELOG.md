<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# Changelog

All notable changes to Spagitty, newest first. Entries are written into
`Unreleased` in the same change as the work they describe (Amendment 20), and a
version's section becomes that version's release notes verbatim — gate 6 reads
it with `tools/release-notes.mjs` and refuses to release without it.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).
Spagitty is at `0.x`: the surface is not yet stable, MINOR may break, PATCH
stays backward-compatible.

## [Unreleased]
### Added

- **Worktrees management (FEAT-062).** Complete lifecycle support for git
  worktrees. Users can view all linked working trees from the repository tabs
  menu or command palette, add new worktrees (with new branches, existing
  branches, or detached HEADs), switch active tabs to linked worktrees, lock
  and unlock worktrees with custom reasons, and remove or prune stale working
  trees.
- **File history and interactive blame view (FEAT-063).** Added a dedicated file
  history view (screen 1O, `/history`) and interactive blame inspector. The view
  renders the file's commit evolution timeline with rename following (`--follow`)
  on the left, alongside a line-by-line blame gutter with author portraits, commit
  hashes, and relative timestamps on the right. Hovering commits highlights all
  contributed lines, and commit chips link directly into the commit graph.
- **Diff syntax highlighting (FEAT-064).** Grammar-based code syntax highlighting
  across all diff views (Diff screen 1B, Working copy 1C, Stashes 1G, Pull
  requests 1H, and File history 1O). Features fast, memory-safe tokenization for
  Rust, TypeScript/JavaScript, Python, Go, C++, HTML, CSS, JSON, TOML, YAML,
  Shell, and SQL with automatic theme adaptation across all light and dark palettes.
- **Image and binary diffs (FEAT-065).** Rich visual image comparisons and binary
  delta inspection across all diff views. Supports 2-up (side-by-side) comparison,
  horizontal swipe split sliders, and opacity onion-skin overlays with transparency
  checkerboard backgrounds for PNG, JPEG, SVG, WebP, GIF, ICO, and AVIF images.
  Non-image binaries display formatted previous/new file sizes and byte deltas.


## [0.2.0] - 2026-08-30

### Added

- **The PR review workspace (FEAT-059).** Clicking a pull request opens a
  dedicated full-window workspace: a header with the title (auto-scrolling on
  hover), author, timestamps, checks, commit count and review status; a
  collapsible left pane of all changed files and commits; a rendered CHANGELOG
  view of the PR description; an interactive diff with inline comment threads —
  replies and resolving change requests — and draft comments that persist in
  `localStorage` until a batch review is published. A flat shimmer replaces the
  old side panel while PRs load.
- **Spagitty, with a face: the brand (FEAT-060).** The app identity is now the
  author's own hand-drawn mark — an amber plate (`#EEB04D`) with four dark
  strands — copied verbatim into `assets/brand/mark.svg` and shipped as the
  app icon at 16/32/128/256/512/1024 (`@2x`, `.ico`, `.icns`) plus the
  favicon, README hero, wordmark lockups and tray/menubar marks, all
  regenerated from that one SVG. `docs/branding.md` is the reference, and the
  app's interactive accent follows the brand amber (`#EEB04D` on dark
  surfaces, darkened to `#976317` on light ones). Gate 2 refuses drift between
  the generators and the committed art. The README, previously empty, now
  ships the hero and the story.
- **Brand guide, interactive showcase, and UI identity integration (FEAT-061).**
  A complete brand authority guide was authored in `docs/branding.md`, and
  `assets/brand/preview.html` was rebuilt as an interactive offline showcase with
  theme toggling, click-to-copy tokens, clearspace visualizer, and platform tray
  simulators. The `BrandMark` vector component is integrated directly into the
  window TitleBar, All Repositories empty state, and Settings About section.

### Changed

- **The frontend toolchain runs on bun (TASK-027).** `bun.lock` replaces
  `package-lock.json`; the CI, build and release workflows install and run
  through `oven-sh/setup-bun` and `bun` commands; and the bundled license list
  in Settings reads the installed frontend tree instead of the npm lockfile.
  npm and node are no longer needed by the project's own tooling. Gate 4 audits
  JS advisories at `--audit-level=high`, matching the pre-bun `npm audit`
  policy.

## [0.1.0] - 2026-08-29

The first release. Everything below is new, so it is one `Added` section rather
than a pretence that anything changed.

### Added

- **The graph** — the commit history as a lane graph with author portraits,
  branch chips carrying divergence, square lane turns, lane compression, and a
  detail panel that can be put away. Search, reflog and tags each have a screen
  of their own.
- **Working copy** — stage, unstage, commit (with signing), discard changes,
  and a diff screen with split and unified views.
- **Branches** — a sortable, resizable table with two-sided divergence bars;
  create, delete and rename; checkout from the toolbar's branch picker.
- **Stash** — list, pop, apply, drop, and browsing a stash entry file by file.
- **Rebase** — interactive rebase planning and execution, and a conflicts
  screen that resolves and writes.
- **Remotes** — fetch, push and pull; clone; remotes management in Settings.
- **Pull requests** — read from GitHub for the open repository, split into
  what needs you and what is waiting on others, with review and check states.
- **The chrome** — repository tabs, a grouped toolbar, a collapsible nav rail,
  a status strip, themes, frosted-glass menus and dialogs, and the git command
  behind each action shown as it runs.
- **Update check** — Settings says when there is a newer Spagitty.
- **Release lane** — releases are tagged from `main` with notes taken from
  this changelog; a manually triggered `dev` build publishes an alpha
  (`-alpha.N`), and a draft build can be cut from any branch without tagging.
  Every lane builds Linux, Windows and macOS; the draft lane ships a `.dmg` for
  Apple silicon and one for Intel. Builds are unsigned, and the release notes
  say what that means on each platform.

`v0.1.0-preview.1` and `v0.1.0-preview.2` were early preview builds cut before
this changelog existed. They remain published as pre-releases and are
superseded by `0.1.0`; they are not withdrawn, only preceded.
