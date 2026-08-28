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
