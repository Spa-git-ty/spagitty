<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-023 — Plan: Flatten UI (remove gradients and shadows)

**Item:** [`agile/items/TASK-023-flat-ui-remove-gradients.md`](../items/TASK-023-flat-ui-remove-gradients.md)

## Approach

Systematically eliminate gradient and shadow declarations across global stylesheets, route views, and components:

1. **Global Styles (`src/app.css`):**
   - Eliminate `--glass-sheen`, `--glass-rim`, `--glass-rim-thick`, `--shadow-1`, `--shadow-2`, `--shadow-3`, and `--sheen` by setting them to `none`.
   - Replace `.ph` linear gradient with solid `--placeholder` token.
   - Flatten `.glow` button rule to solid `var(--accent)` fill without conic border travel animation.
   - Remove inset shadows on form inputs, textareas, and select elements.

2. **Window & Layout (`src/routes/+layout.svelte`):**
   - Remove outer window cast shadow and maximize sheen.

3. **Route Headers and Footers (`src/routes/**/+page.svelte`):**
   - Remove all top/bottom `box-shadow` rules across root, branches, changes, conflicts, diff, rebase, reflog, repos, requests, search, settings, and stash screens.

4. **Component Views:**
   - `src/lib/branches/BranchTable.svelte`: Replace `.row.current` gradient fade with `var(--selection)`.
   - `src/lib/changes/FileColumn.svelte`: Replace `.row.conflicted` and `.row.selected` gradient fills with solid `var(--danger-soft)` and `var(--selection)`.
   - `src/lib/graph/CommitRows.svelte`: Replace `.row.selected` gradient with `var(--selection)` and eliminate gradient edge shadows.
   - `src/lib/requests/RequestRow.svelte`: Replace `.row.open` gradient with `var(--selection)`.
   - `src/lib/ui/RefChip.svelte`: Flatten `.ref.current` and `.ref.tag` linear gradients and remove shadow.
   - `src/lib/ui/Chip.svelte` and `src/lib/ui/Btn.svelte`: Remove button and active chip shadows.
   - `src/lib/ui/NoticeToast.svelte`: Remove gradient overlays on `.notice` and `.notice.error`.

5. **Test Invariant & Index Updates:**
   - Update `src/lib/ui/btn.test.ts` to assert that global `.glow` rules paint solid `var(--accent)`.
   - Register TASK-023 in `agile/README.md` index table.

## Risks & Rollback

- **Risk:** Contrast loss on active selections or borders.
  - **Mitigation:** Built-in theme tokens (`--selection`, `--surface`, `--accent`, `--line`) provide tested contrast across themes.
- **Rollback:** `git revert` or restoring tokens from base branch `dev`.
