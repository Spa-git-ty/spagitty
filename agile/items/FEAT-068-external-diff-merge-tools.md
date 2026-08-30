<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-068 — External diff and merge tool launchers

**Status:** Done.
**Screens:** Settings (1K), Diff screen (1B), Conflicts (1D), context menus.
**Raised by:** gap analysis in `docs/analysis/gitkraken-gap.md`.

## Problem

Developers often have specialized external diff and 3-way merge tools installed
(such as VS Code, Meld, Beyond Compare, Kaleidoscope, Sublime Merge, or KDiff3).
Spagitty currently provides no UI settings or context menu actions to launch an
external diff/merge tool for files or conflict resolution.

## Change

- **Configuration in Settings (1K):**
  - Section for "External Tools" reading existing git configuration (`diff.tool`, `merge.tool`).
  - Auto-discovery of installed tools from system `$PATH`.
  - Custom tool command templating supporting variables: `$LOCAL`, `$REMOTE`, `$MERGED`, `$BASE`.
- **Launch integration:**
  - "Open in External Diff Tool" action in right-click context menus on files across Working copy, Diff, and Stash screens.
  - "Launch External Merge Tool" button on Conflicts (1D) screen for unresolved conflict files.
  - Spagitty watches the file or spawned process and refreshes index status when the external tool exits.

## Non-scope

- Bundling third-party diff/merge binaries with Spagitty installer.
- Supporting remote web-based diff editors.

## Acceptance criteria

- Auto-detection correctly identifies known tools present in `$PATH`.
- Launching an external tool runs detached without hanging Spagitty's main process.
- File edits made during external merge sessions trigger automatic git status reload upon tool closure.
- `tools/record.test.ts` passes.
