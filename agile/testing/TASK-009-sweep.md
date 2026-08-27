<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-009 — Manual sweep

**Item:** [`agile/items/TASK-009-drop-the-work-item-ids.md`](../items/TASK-009-drop-the-work-item-ids.md)

This item is entirely text on screens the suite does not mount. A human reading
each one is the verification.

---

## TASK-009-T1 — The network narration is gone

**Priority:** high — this is what was reported.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open Pull requests with no account connected | The empty state offers Settings → Accounts. |
| 2 | Read it | **No** "Nothing in this application talks to a network today." |
| 3 | Look at the bottom of the screen | **No footer**, and no bordered empty strip where it was. |
| 4 | Open Settings → Accounts | Says no account is connected and what connecting one takes. **No** paragraph about there being no HTTP client. |

**Result:**

---

## TASK-009-T2 — No work item identifier anywhere

**Priority:** high

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open Conflicts, hover the disabled buttons and read the footer | Say what is not built. **No** `FEAT-016`. |
| 2 | Open Rebase, hover Apply | Says the screen plans the rebase. **No** `FEAT-015`. |
| 3 | Open Settings → Behaviour, read every toggle's explanation | Say what is not honoured yet. **No** `FEAT-019` or `FEAT-015`. |
| 4 | Open a pull request, hover Review and Merge | Say they need a connected account. **No** `FEAT-017`. |
| 5 | Walk every screen looking for `FEAT-`, `BUG-` or `TASK-` | None anywhere. |

**Result:**

---

## TASK-009-T3 — Controls still explain themselves

**Priority:** high — the regression risk. Removing the identifier must not leave a control silent.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Hover every disabled control found in T2 | Each has a title, and it says what is missing in plain words. |
| 2 | Confirm none is now blank | A control that cannot run and says nothing is worse than one quoting an identifier. |

**Result:**

---

## TASK-009-T4 — The privacy promise survives

**Priority:** high — kept deliberately; losing it would be a defect of this item.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open Settings → Accounts | Reads "Nothing here leaves this machine except through a service you connect yourself." |
| 2 | Confirm it is not hedged or removed | It is a commitment, and it is the one sentence here the user cannot verify by looking. |

**Result:**
