<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-014 — Manual sweep

**Item:** [`agile/items/FEAT-014-stash-pop-apply-drop.md`](../items/FEAT-014-stash-pop-apply-drop.md)

**These tickets write to the working copy and one of them destroys a stash
entry. Use a scratch repository.**

Tester fills the **Result** column.

---

## FEAT-014-T1 — Apply keeps the entry

**Priority:** high
**Preconditions:** a scratch repository with at least two stash entries and a clean working copy.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the Stash screen and select an entry | Its files are listed. |
| 2 | Click **Apply — keep in stash** | A confirmation appears naming the entry and saying the entry is kept. |
| 3 | Cancel it | Nothing happens. The list is unchanged and the working copy is still clean. |
| 4 | Click Apply again and confirm | The changes appear in the working copy. A success notice says "Applied". |
| 5 | Check the stash list | The entry is **still there**, and still selected. |
| 6 | Check the rail's stash count | Unchanged. |

**Result:**

---

## FEAT-014-T2 — Pop removes the entry

**Priority:** high

| # | Step | Expected |
| --- | --- | --- |
| 1 | Reset the working copy clean, select an entry | — |
| 2 | Click **Pop**, confirm | Changes appear in the working copy; notice says "Popped". |
| 3 | Check the stash list | The entry is **gone**, and the list has re-read itself without a manual refresh. |
| 4 | Check the selection | It moved to another entry, or the detail pane is empty — **not** pointing at the entry that was removed. |
| 5 | Check the rail's stash count | Decreased by one. |

**Result:**

---

## FEAT-014-T3 — Drop destroys, and says so first

**Priority:** high — the unrecoverable one.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Select an entry, click **Drop** | A confirmation appears, **marked as destructive**, saying the entry is removed without being restored and survives in the reflog until git expires it. |
| 2 | Cancel | The entry is still there. |
| 3 | Click Drop again and confirm | Entry gone, notice says "Dropped", working copy **unchanged**. |
| 4 | Check the list and the rail count | Both re-read. |

**Result:**

---

## FEAT-014-T4 — Double click does not drop twice

**Priority:** high — this is what the busy guard is for.

| # | Step | Expected |
| --- | --- | --- |
| 1 | With at least three entries, click **Drop** twice in quick succession | **One** confirmation appears, not two. |
| 2 | Confirm it | Exactly **one** entry is removed. |
| 3 | Compare the list before and after | Exactly one fewer entry. |

**Result:**

---

## FEAT-014-T5 — Failures surface

**Priority:** medium

| # | Step | Expected |
| --- | --- | --- |
| 1 | Make the working copy dirty in a way that conflicts with an entry, then Pop it | A notice carries **git's own message**. |
| 2 | Check the stash list | The entry **survives** — git does not drop it when the apply fails. |
| 3 | **Known limitation.** If the working copy is now conflicted, the screen does not explain that as its own state | Expected. Recorded in the item; it needs FEAT-016. Note what the user is left looking at. |

**Result:**

---

## FEAT-014-T6 — The old copy is gone

**Priority:** medium

| # | Step | Expected |
| --- | --- | --- |
| 1 | Read the Stash screen | No "Not built yet" anywhere. |
| 2 | Hover each of the three chips | Each says what it does, in the present tense. |
| 3 | Confirm the screen does not mention a terminal | The `git stash pop …` line is gone. |
| 4 | Confirm the chips look clickable | They are buttons, and hover as controls. |

**Result:**

---

## FEAT-014-T7 — One wording, two screens

**Priority:** medium — the reason the confirmation was not duplicated.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Trigger Drop from the Stash screen and read the confirmation | Note the exact wording. |
| 2 | Trigger the same operation from the graph's stash context menu | **Identical** wording. |
| 3 | Repeat for Pop and Apply | Identical in both places. |

**Result:**
