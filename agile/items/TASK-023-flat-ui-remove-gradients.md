<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-023 — Flatten UI: remove gradients and shadows

**Status:** Done on `task/TASK-023-enhancements`.
**Screen:** Global UI chrome, tables, chips, and components.
**Raised by:** the author: "I have weird gradient that I don't like in many places on the UI so can you remove it make the designs flat then we will fine tune them", followed by "ok also remove shadows !".

## Problem

Multiple UI components and global stylesheets used gradient fills (`linear-gradient`, `conic-gradient`) and elevation/rim shadows (`--shadow-1`, `--shadow-2`, `--shadow-3`, `--glass-rim`, `--sheen`, and explicit header/footer box-shadows). The author requested removing both gradients and shadows to establish a completely flat design baseline across the application.

## Change

- Set elevation shadow tokens (`--shadow-1`, `--shadow-2`, `--shadow-3`), sheen (`--sheen`), and glass rim tokens (`--glass-rim`, `--glass-rim-thick`, `--glass-sheen`) to `none` in `src/app.css`.
- Remove input/textarea/select inset shadows in `src/app.css`.
- Remove outer window cast shadow and maximize inset shadow in `src/routes/+layout.svelte`.
- Remove head/foot box shadows across all route views (`+page.svelte` in `branches`, `changes`, `conflicts`, `diff`, `rebase`, `reflog`, `repos`, `requests`, `search`, `settings`, `stash`, and root `+page.svelte`).
- Remove button and chip shadows in `Btn.svelte`, `Chip.svelte`, `RefChip.svelte`, and `Toolbar.svelte`.
- Flatten placeholder bars (`.ph`) in `src/app.css` to solid `--placeholder`.
- Flatten `.glow` button styling in `src/app.css` to flat solid accent fill without animated conic gradients.
- Replace linear-gradient selection and state fades in `BranchTable.svelte`, `FileColumn.svelte`, `CommitRows.svelte`, and `RequestRow.svelte` with flat palette tokens (`--selection`, `--danger-soft`).
- Flatten `RefChip.svelte` current branch and tag gradient fills to flat `color-mix` fills.
- Remove background gradient overlays from `NoticeToast.svelte`.

## Non-scope

- Identicon avatars (`portrait.ts`) which generate radial color blobs for commit author identicons.
- Structural layout and geometry changes.

## Acceptance criteria

- No visible linear or conic gradient washes or elevation/rim shadows across the UI.
- Surfaces, controls, and selection states render flat with crisp solid borders.
- All tests pass and test coverage remains above the 70% floor under Amendment 10.

## Dependencies

None.
