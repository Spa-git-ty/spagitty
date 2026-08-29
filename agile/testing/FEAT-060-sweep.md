<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-060 — Sweep

**Item:** [`agile/items/FEAT-060-spagitty-brand.md`](../items/FEAT-060-spagitty-brand.md)

## What a human checks at the window

Swift, per Amendment 4: the wheel stays with the author; the checklist is what
verification the automated suite cannot run — how it actually *looks*.

1. **The app icon at every size.** `src-tauri/icons/icon.png` at 512, then
   the window's taskbar/dock at 32 and 16. The tangle should read as
   continuing beyond the frame, the lanes should be visibly two colours and
   parallel below the waist, and the three nodes should survive intact to 16px.
2. **The ground colour.** The plate should now match the app's own `--panel`
   (`#181825` in the dark theme) rather than a colour the icon made up — the
   icon should sit on the panels as if it grew there.
3. **The lockups.** `assets/brand/lockups/lockup-ink-light.png` on a dark
   surface and `lockup-ink-dark.png` on a light one: mark and wordmark should
   sit on one optical centreline, with the wordmark's letterspacing reading as
   deliberate rather than broken.
4. **The monogram.** The single-strand S should read as the *same* mark
   squeezed to one strand — same wheat, same node at the foot.
5. **The hero.** `assets/brand/hero.png` at README width: mark left, wordmark
   + tagline, faint lane columns right. No banding, no clipped text.
6. **Tray/menubar.** `tray-white` on a dark tray, `tray-black` on a bright
   one, `menubar-mono` in macOS; each should still show three nodes at 22px.
7. **The prohibition.** The whole set must contain nothing that reads as the
   Git project's mark or orange.

## What this sweep cannot say

- It cannot judge whether the identity is *good* — only whether it is
  consistent. If the shape wants a change, that is a new item, not a
  hand-edit of the bytes (the gate-2 drift check refuses hand-edits anyway).