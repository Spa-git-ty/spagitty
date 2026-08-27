<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-023 — Flatten UI and remove gradients

**Status:** Done on `task/TASK-023-enhancements`.
**Screen:** Global UI chrome, tables, chips, and components.
**Raised by:** the author: "I have weird gradient that I don't like in many places on the UI so can you remove it make the designs flat then we will fine tune them".

## Problem

Multiple UI components and global stylesheets used gradient fills (`linear-gradient`, `conic-gradient`), including glass sheens, traveling border glow animations, row selection fades, chip backgrounds, and notice toasts. The author requested removing these gradients to establish a clean, flat design baseline across the UI before fine-tuning.

## Change

- Replace glass sheen gradients in `src/app.css` (`--glass-sheen`) with `none`.
- Flatten placeholder bars (`.ph`) in `src/app.css` to solid `--placeholder`.
- Flatten `.glow` button styling in `src/app.css` to flat solid accent fill without animated conic gradients.
- Replace linear-gradient selection and state fades in `BranchTable.svelte`, `FileColumn.svelte`, `CommitRows.svelte`, and `RequestRow.svelte` with flat palette tokens (`--selection`, `--danger-soft`).
- Flatten `RefChip.svelte` current branch and tag gradient fills to flat `color-mix` fills.
- Remove background gradient overlays from `NoticeToast.svelte`.

## Non-scope

- Identicon avatars (`portrait.ts`) which generate radial color blobs for commit author identicons.
- Structural layout and geometry changes.

## Acceptance criteria

- No visible linear or conic gradient washes on buttons, rows, tables, chips, and toast chrome.
- Primary buttons and selection states render with solid, flat theme tokens.
- All tests pass and test coverage remains above the 70% floor under Amendment 10.

## Dependencies

None.
