<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-023 — Plan: Flatten UI and remove gradients

**Item:** [`agile/items/TASK-023-flat-ui-remove-gradients.md`](../items/TASK-023-flat-ui-remove-gradients.md)

## Approach

Systematically audit and eliminate gradient declarations across global stylesheets and component views:

1. **Global Styles (`src/app.css`):**
   - Eliminate `--glass-sheen` linear gradients in both light and dark themes.
   - Replace `.ph` linear gradient with solid `--placeholder` token.
   - Flatten `.glow` button rule to solid `var(--accent)` fill without conic border travel animation.

2. **Component Views:**
   - `src/lib/branches/BranchTable.svelte`: Replace `.row.current` gradient fade with `var(--selection)`.
   - `src/lib/changes/FileColumn.svelte`: Replace `.row.conflicted` and `.row.selected` gradient fills with solid `var(--danger-soft)` and `var(--selection)`.
   - `src/lib/graph/CommitRows.svelte`: Replace `.row.selected` gradient with `var(--selection)` and eliminate gradient edge shadows.
   - `src/lib/requests/RequestRow.svelte`: Replace `.row.open` gradient with `var(--selection)`.
   - `src/lib/ui/RefChip.svelte`: Flatten `.ref.current` and `.ref.tag` linear gradients into flat solid mixed surfaces.
   - `src/lib/ui/NoticeToast.svelte`: Remove gradient overlays on `.notice` and `.notice.error`.

3. **Test Invariant Updates:**
   - Update `src/lib/ui/btn.test.ts` to assert that global `.glow` rules paint solid `var(--accent)` without multi-box gradients.

## Risks & Rollback

- **Risk:** Contrast loss on active selections.
  - **Mitigation:** Built-in theme tokens (`--selection`, `--surface`, `--accent`) already provide tested contrast across themes.
- **Rollback:** `git revert` or restoring gradient tokens from base branch `dev`.
