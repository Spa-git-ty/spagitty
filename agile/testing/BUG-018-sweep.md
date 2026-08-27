<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-018 — Manual sweep

**Item:** [`agile/items/BUG-018-a-menu-cannot-be-dismissed.md`](../items/BUG-018-a-menu-cannot-be-dismissed.md)

**Preconditions for every ticket:** a build of
`bugfix/BUG-018-a-menu-cannot-be-dismissed` and a repository open. Every ticket
here is about what is left on screen afterwards, so look at the place the menu
was, not at the menu.

---

## BUG-018-T1 — The reported failure is gone

**Priority:** high — this is the report, made four times.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the branch dropdown in the toolbar | The menu opens, with its frost. |
| 2 | Click on empty space in the commit list | The menu goes — all of it. Not the frost first and a flat panel left behind. |
| 3 | Open it again, and again dismiss it, six or seven times | Nothing accumulates. The seventh looks like the first. |
| 4 | Open it, dismiss it, then open a different menu somewhere else | One menu on screen, in the new place, with nothing under it. |

**Result:**

---

## BUG-018-T2 — Every route out

**Priority:** high — the leak was in teardown, so every way of reaching teardown matters.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a menu, press Escape | Gone, nothing left. |
| 2 | Open a menu, click one of its entries | Gone, and the action runs. |
| 3 | Open a menu, click the control that opened it | Gone. It closes rather than reopening. |
| 4 | Open a menu, click a different control that opens its own menu | The first goes, the second opens. One on screen. |
| 5 | Open a menu, then Tab away from it | Gone — focus leaving is a dismissal. |
| 6 | Open a menu, then click another application and come back | Gone. |
| 7 | Open a menu, then resize the window | Gone. |

**Result:**

---

## BUG-018-T3 — Every menu in the application

**Priority:** high — the fault is in the shared action, so it was in all of them.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Right-click a commit in the graph, dismiss it | Nothing left behind. |
| 2 | Right-click the graph's column header, dismiss it | Same. |
| 3 | Right-click a repository tab, dismiss it | Same. |
| 4 | The tab strip's add button, dismiss it | Same, and clicking the button again closes it. |
| 5 | The graph's branch-visibility gear, dismiss it | Same, and the gear toggles. |
| 6 | Right-click a branch on the Branches screen, dismiss it | Same. |
| 7 | Right-click Pull and Fetch in the toolbar, dismiss each | Same. |

**Result:**

---

## BUG-018-T4 — Dialogs, which are not portaled

**Priority:** high — the fix removes a node, and must not remove one it never moved.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Trigger a confirmation dialog — a history rewrite will do | The dialog appears, centred, with its frost. |
| 2 | Cancel it | It goes cleanly. |
| 3 | Do it three times | Nothing accumulates, and nothing vanishes early. |
| 4 | Open a menu over a dialog, dismiss the menu, then the dialog | The menu goes and the dialog stays. Then the dialog goes. |

**Result:**

---

## BUG-018-T5 — The glass still behaves

**Priority:** medium — the teardown also drops the shared stage.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a menu and look at the frost | Present and on the menu's own footprint. |
| 2 | Dismiss it and watch the application behind | Comes back to normal — no residual blur, no residual displacement anywhere. |
| 3 | Open two panes at once: a menu over a dialog | Both frosted, both correct at the overlap. |
| 4 | Dismiss them one at a time | The remaining one keeps its frost. Only when the last goes does the effect come off entirely. |
| 5 | Repeat step 3 and 4 several times | No drift: the tenth time looks like the first. |

**Result:**
