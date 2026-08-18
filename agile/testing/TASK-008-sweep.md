<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-008 — Manual sweep

**Item:** [`agile/items/TASK-008-branches-footer.md`](../items/TASK-008-branches-footer.md)

Three tickets. This is a one-sentence removal, and the only thing that could go
wrong is losing the error branch with it.

Tester fills the **Result** column.

---

## TASK-008-T1 — The sentence is gone, and so is the empty strip

**Priority:** high

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the Branches screen | Rows render. |
| 2 | Look at the bottom of the screen | **No footer at all** — not the sentence, and not a bordered empty strip where it was. |
| 3 | Search the screen for "Nothing here deletes a branch" | Not present. |

**Result:**

---

## TASK-008-T2 — Failures still surface

**Priority:** high — the regression risk.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Force a branch write failure — e.g. rename a branch to a name that already exists | A footer **appears** at the bottom carrying git's own message. |
| 2 | Resolve the situation and act again successfully | The footer **disappears** again. |

**Result:**

---

## TASK-008-T3 — The information moved, it did not vanish

**Priority:** medium

| # | Step | Expected |
| --- | --- | --- |
| 1 | Find the Delete chip on any branch row | It is present and inert. |
| 2 | Hover it | Its tooltip reads "Deleting branches is not built yet". |
| 3 | Click it | Nothing happens, and nothing is destroyed. |

**Result:**
