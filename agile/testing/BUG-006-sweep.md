<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-006 — Manual sweep

**Item:** [`agile/items/BUG-006-repo-card-branch-overlap.md`](../items/BUG-006-repo-card-branch-overlap.md)

The automated tests assert the CSS rule. Only a human can confirm that the
ellipsis actually appears and that nothing else moved, because the test
environment applies no stylesheet.

**The fix is on `RefChip`, which every screen uses.** T3 to T6 exist for that
reason: the reported defect was on one screen, the change reaches all of them.

Tester fills the **Result** column.

---

## BUG-006-T1 — The reported defect is gone

**Priority:** high
**Preconditions:** a repository whose current branch name is long enough to
exceed the card width — e.g. `correzioni-e-rilavorazioni-su-i-bilanci` — and
which has more than one branch so the count renders.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the All repositories screen | The card for that repository is visible. |
| 2 | Look at the branch row | The branch name is **truncated with an ellipsis**. It does not run over anything. |
| 3 | Read the count beside it | "N branches" is **fully readable**, not truncated and not painted over. |
| 4 | Hover the branch chip | A tooltip shows the **full** branch name. |
| 5 | Compare against the reported screenshot | The two pieces of text no longer occupy the same pixels. |

**Result:**

---

## BUG-006-T2 — The count never truncates instead

**Priority:** high — this is the judgement the fix encodes.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Find or create a repository with a very long branch name and a three-digit branch count | Both render. |
| 2 | Read the count | Shows in full — e.g. "128 branches". The **name** absorbs all of the truncation, never the count. |
| 3 | Narrow the window as far as it goes | Still true. The name shortens further; the count stays whole. |

**Result:**

---

## BUG-006-T3 — Short names are unchanged

**Priority:** high — a fix that truncates things that used to fit is a worse bug.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Look at a card whose branch is `main` or `dev` | Rendered in full, **no ellipsis**, exactly as before. |
| 2 | Compare chip padding, border and check mark against a card from before the fix | Identical. The chip's size and spacing are unchanged when it fits. |
| 3 | Look at a card for the currently open repository | The current-branch chip still has its accent border and its ✔. |

**Result:**

---

## BUG-006-T4 — The graph's ref chips still look right

**Priority:** high — same component, different container.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the Graph screen on a repository with branch and tag refs | Chips render in the ref column as before. |
| 2 | Find a commit carrying a long branch name | It truncates with an ellipsis **within the ref column** rather than overflowing into the graph. |
| 3 | Find a commit carrying several refs at once | They sit side by side; none overlaps another. |
| 4 | Widen and narrow the Branch/Tag column by dragging its divider | Chips grow and shrink with it; the ellipsis follows the available width. |
| 5 | Check tag chips specifically | Still notched and dashed — the tag styling is intact. |

**Result:**

---

## BUG-006-T5 — The branches table

**Priority:** medium

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the Branches screen | Every row's chip renders. |
| 2 | Find the longest branch name in the list | Truncates with an ellipsis; the columns beside it are unaffected. |
| 3 | Hover it | Full name in the tooltip. |

**Result:**

---

## BUG-006-T6 — Commit detail

**Priority:** medium

| # | Step | Expected |
| --- | --- | --- |
| 1 | Select a commit that carries refs | The detail panel lists them. |
| 2 | Narrow the panel with its splitter | Chips truncate rather than overflowing the panel or forcing it wider. |

**Result:**

---

## BUG-006-T7 — Text size and zoom

**Priority:** medium — the card has a fixed width, so scaling text changes how much fits.

| # | Step | Expected |
| --- | --- | --- |
| 1 | On the All repositories screen, raise text size to 130% | Branch names truncate earlier. Nothing overlaps at any step. |
| 2 | Raise interface zoom to 200% | Same. |
| 3 | Return both to 100% | Layout returns to T1's state. |

**Result:**

---

## BUG-006-T8 — The path line was deliberately not touched

**Priority:** low — recorded so the tester knows it is out of scope, not missed.

`.path` carries `direction: rtl`, flagged during triage as the other classic
source of visual overlap. It was left alone because the reported defect was the
chip, and changing an unimplicated rule carries its own regression risk.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Look at the path line on several cards | Truncates from the **left**, keeping the directory name visible — unchanged behaviour. |
| 2 | If any path is seen overlapping or reordering its punctuation | **File a new item.** Do not treat it as a BUG-006 failure. |

**Result:**
