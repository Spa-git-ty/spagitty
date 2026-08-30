<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-067 — Submodules management

**Status:** Backlog
**Screens:** Branches screen (1F), Settings (1K), Rail footer.
**Raised by:** gap analysis in `docs/analysis/gitkraken-gap.md`.

## Problem

Repositories utilizing Git submodules currently only receive a static count in the
rail footer. There is no in-app UI to view submodule statuses, initialize uninitialized
submodules, update commits, or detect dirty working trees inside submodules, forcing
users back to the CLI for routine `git submodule update --init --recursive`.

## Change

- **Core submodule queries and commands:**
  - `submodules::list(repo_path)` returning submodule path, name, configured URL,
    current HEAD SHA, recorded superproject SHA, and dirty status.
  - `submodules::init(repo_path, paths, recursive)`.
  - `submodules::update(repo_path, paths, init, recursive, remote)`.
  - `submodules::sync(repo_path)`.
- **UI Integration:**
  - Dedicated Submodules section on the Branches/Repositories screens or in Settings.
  - Visual status pill indicating whether a submodule HEAD matches the committed tree SHA.
  - "Update Submodules" action in the toolbar and repository menu with one-click recursive init.
  - Clicking a submodule opens its directory as a repository tab in Spagitty.

## Non-scope

- Converting submodules into git subtree or vice versa.
- Advanced recursive submodule rebase automation.

## Acceptance criteria

- Submodule status (clean, modified, uninitialized, out-of-sync SHA) is detected reliably.
- `update --init --recursive` executes with streaming progress output.
- Submodule entries link directly to nested repository views.
- `tools/record.test.ts` passes.
