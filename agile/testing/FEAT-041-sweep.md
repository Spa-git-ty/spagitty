<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-041 — Manual sweep

**Item:** [`agile/items/FEAT-041-rail-drops-the-shortcut-hint.md`](../items/FEAT-041-rail-drops-the-shortcut-hint.md)

---

## FEAT-041-T1 — The hint is gone and the shortcut is not

**Priority:** high — the item, and the thing it must not break.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Look at the Log item in the rail | The label alone. No `Ctrl+F`. |
| 2 | Press `Ctrl+F` (or `⌘F`) from the Graph screen | Log search opens with the field focused. |
| 3 | Press it again from Settings | The same. |
| 4 | Open the palette with `Ctrl/Cmd+P` and find the Log command | It lists the shortcut, in this platform's notation. |

**Result:**

---

## FEAT-041-T2 — The right-hand column reads as one thing

**Priority:** medium — why the Settings dot went too.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a repository and read down the rail | Numbers beside the screens that have counts; nothing beside Pull requests, Rebase, Log and Settings. |
| 2 | Look at Settings specifically | No `·`. It is no longer waiting for a number it will never have. |
| 3 | Open the app with no repository, before the counts are computed | `·` beside the counted screens — the "not computed yet" convention, unchanged. |
| 4 | Watch the counts land | The dots become numbers. |

**Result:**

---

## FEAT-041-T3 — The rail is otherwise untouched

**Priority:** medium.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Collapse the rail | Glyphs only, exactly as before. |
| 2 | Expand it | Labels and counts, in the same order. |
| 3 | Click every item | Each still reaches its screen, and the active one is marked. |
| 4 | Read the rail with a screen reader | Each item announces its label; nothing announces a stray dot. |

**Result:**
