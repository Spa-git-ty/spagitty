<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-007 — Manual sweep

**Item:** [`agile/items/BUG-007-replaced-dialog-resolves-wrong-value.md`](../items/BUG-007-replaced-dialog-resolves-wrong-value.md)

Short: the store is unit-tested from three angles. What a human adds is
confirming the defect is unreachable through the real UI, and that ordinary
dialogs are unchanged.

Tester fills the **Result** column.

---

## BUG-007-T1 — The defect, through the interface

**Priority:** high
**Preconditions:** a repository open on the Graph screen.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Right-click a commit → *Create branch here* | A naming prompt appears. |
| 2 | **Without answering it**, open the command palette and run an action that asks for confirmation | The prompt is replaced by the confirmation. |
| 3 | Answer or dismiss the confirmation | — |
| 4 | Check the branch list | **No branch was created.** In particular there is no branch named `false`. |
| 5 | Check for error notices | None from the abandoned prompt. |

**Result:**

---

## BUG-007-T2 — Ordinary dialogs are unchanged

**Priority:** high — the regression risk.

| # | Step | Expected |
| --- | --- | --- |
| 1 | *Create branch here*, type a name, press Enter | Branch created and checked out. |
| 2 | *Create branch here*, press Escape | Nothing created. |
| 3 | *Create branch here*, click Cancel | Nothing created. |
| 4 | *Reset hard*, click Cancel | Nothing reset. |
| 5 | *Reset hard*, confirm | Reset happens. |
| 6 | *Rename branch*, accept the pre-filled name unchanged | Nothing renamed — it is a no-op, not a rename to itself. |

**Result:**

---

## BUG-007-T3 — Replacement in both directions

**Priority:** medium

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a confirmation, then trigger a prompt without answering | The confirmation is treated as declined; its operation does **not** run. |
| 2 | Open a prompt, then trigger another prompt | The first is abandoned; nothing is created from it. |
| 3 | In each case, answer the second dialog normally | Only the second dialog's operation happens. |

**Result:**
