<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-037 — Manual sweep

**Item:** [`agile/items/FEAT-037-window-depth-and-resizable-panels.md`](../items/FEAT-037-window-depth-and-resizable-panels.md)

Half of this item is a judgement about how something looks, and the other half
sets `transparent: true` on a platform where transparency has bitten before.
**T1 is the one that decides whether this item ships.**

---

## FEAT-037-T1 — The window still works at all

**Priority:** high — **run this first.** BUG-004 was a WebKitGTK defect that left the window blank for a whole session, and transparency is the same subsystem.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Close every running instance, then launch | The window appears with content. **Not blank.** |
| 2 | Click something | It responds. Input is not passing through to the desktop. |
| 3 | Drag the title bar | The window moves. |
| 4 | Drag each edge and corner | The window resizes. |
| 5 | If any of 1–4 fails | **Stop.** Set `transparent` back to `false` in `tauri.conf.json` and rebuild. The corner and edge survive; the shadow does not. |

**Result:**

---

## FEAT-037-T2 — It has depth

**Priority:** high

| # | Step | Expected |
| --- | --- | --- |
| 1 | Put a light background behind the window | A shadow is visible under and around it. |
| 2 | Put a dark background behind it | Still visible — the dark theme uses a denser, near-black cast for exactly this. |
| 3 | Look at the corners | Softly rounded, and the content is clipped to them — no square corner poking out. |
| 4 | Look closely at the edge | A hairline outline, and a slightly lighter line along the top. |
| 5 | Judge it | Does it read as a physical surface, or as a rectangle with effects on it? Say which. |

**Result:**

---

## FEAT-037-T3 — Maximized is square

**Priority:** high

| # | Step | Expected |
| --- | --- | --- |
| 1 | Maximize the window | Corners go **square**, the shadow goes, and there is **no gap** between the app and the screen edge. |
| 2 | Restore it | Corner, edge and shadow all come back. |
| 3 | Maximize and restore several times | No flicker, and no gap left behind in either state. |
| 4 | Snap the window to half the screen | Judge whether it should be square there too, and say so. |

**Result:**

---

## FEAT-037-T4 — Both themes

**Priority:** medium

| # | Step | Expected |
| --- | --- | --- |
| 1 | Switch to light | The edge is visible against the window's own surface, and the shadow reads. |
| 2 | Switch to dark | Same. The edge is *lighter* than the surface here, which is the only way it reads at all. |
| 3 | Switch while maximized | Neither theme leaves a corner or a shadow behind. |

**Result:**

---

## FEAT-037-T5 — Every panel resizes

**Priority:** high — this is the second request.

| # | Step | Expected |
| --- | --- | --- |
| 1 | **Stash** — drag the divider left of the detail panel | It resizes. This is what was reported. |
| 2 | **Working copy** — drag the divider right of the file list | It resizes. |
| 3 | **Diff** — same | It resizes. |
| 4 | **Pull requests** — drag the divider left of the detail panel | It resizes. |
| 5 | **Graph** and the **nav rail** | Both still resize as before. |
| 6 | On each, drag far past both ends | Each stops at a sensible width. Nothing collapses to nothing or eats the screen. |

**Result:**

---

## FEAT-037-T6 — Widths persist and are independent

**Priority:** high

| # | Step | Expected |
| --- | --- | --- |
| 1 | Set a distinct width on each of the five panels | Each holds. |
| 2 | Close and reopen the app | **All five** are remembered. |
| 3 | Confirm they did not affect each other | Resizing the Diff file list did not move the Stash panel. |
| 4 | Double-click a splitter | That panel returns to its default; the others are untouched. |

**Result:**

---

## FEAT-037-T7 — The collapsed rail is still locked

**Priority:** medium — the one panel that must **not** resize.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Collapse the rail, then try to drag its splitter | Nothing happens. |
| 2 | Expand it again | It returns to the width it had, not to the default. |
