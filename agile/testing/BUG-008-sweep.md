<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-008 — Manual sweep

**Item:** [`agile/items/BUG-008-menu-arrow-up-from-nothing.md`](../items/BUG-008-menu-arrow-up-from-nothing.md)

`Menu.svelte` is every right-click menu in the application, so the check is
cheap but should be done in more than one place.

Tester fills the **Result** column.

---

## BUG-008-T1 — ArrowUp opens at the end

**Priority:** high

| # | Step | Expected |
| --- | --- | --- |
| 1 | Right-click a commit row | Menu opens with **nothing** highlighted. |
| 2 | Press `ArrowUp` once | The **last** entry is highlighted — not the middle, not the second-from-last. |
| 3 | Press `Escape`, right-click again, press `ArrowDown` once | The **first** entry is highlighted. |
| 4 | Repeat on a menu with a different number of entries — a branch chip, a stash row | Same in both cases. The old defect gave a different wrong answer per menu length. |

**Result:**

---

## BUG-008-T2 — Stepping still works after the first press

**Priority:** high — the regression risk.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a menu, press `ArrowDown` repeatedly past the last entry | Wraps to the first. |
| 2 | Press `ArrowUp` repeatedly past the first | Wraps to the last. |
| 3 | Confirm headings and separators are never highlighted | They are skipped. |
| 4 | Confirm disabled entries are never highlighted | They are skipped in both directions. |
| 5 | Press `Enter` on a highlighted entry | It runs, and the menu closes first. |

**Result:**

---

## BUG-008-T3 — Opening upward past a disabled last entry

**Priority:** medium

| # | Step | Expected |
| --- | --- | --- |
| 1 | Find a menu whose **last** entry is disabled — e.g. right-click the checked-out branch, where Delete is disabled | The disabled entry is shown with its reason. |
| 2 | Press `ArrowUp` as the first key | The highlight lands on the last entry that **can** run, skipping the disabled one. |
| 3 | Press `Enter` | That entry runs. |

**Result:**
