<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-007 — Manual sweep

**Item:** [`agile/items/TASK-007-copy-sweep.md`](../items/TASK-007-copy-sweep.md)

Almost all of this item is text on screens, and the route components are not
mounted in the automated suite. A human reading each screen is the verification.

Tester fills the **Result** column.

---

## TASK-007-T1 — Working copy

**Priority:** high
**Preconditions:** a repository with at least one modified file.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the Working copy screen | The footer holds the commit button. |
| 2 | Read the footer | **No** sentence "Nothing is committed until you press the button." |
| 3 | Check the footer is not an empty strip | It holds the button, so it looks deliberate — not a bare bordered band. |
| 4 | Create a conflict, return to the screen | "Resolve the conflicts before committing." **still appears** — it says why the button is disabled, which is not visible otherwise. |
| 5 | Force a write failure (e.g. commit with no identity configured) | The error text appears in the footer. Error reporting was not removed. |

**Result:**

---

## TASK-007-T2 — Branches

**Priority:** high
**Preconditions:** a repository with a branch that has an upstream.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the Branches screen | Rows render. |
| 2 | Read the footer | **No** sentence about ahead/behind being counted against the last fetch, and none about the screen not talking to a network. |
| 3 | Note what the footer does say | "Nothing here deletes a branch." — **still present**, deliberately. It was not in the approved removal list. See the item's "Raised, not absorbed"; flag it if it should go too. |
| 4 | Force a write failure | The error replaces that sentence. |

**Result:**

---

## TASK-007-T3 — Stash

**Priority:** high

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the Stash screen with at least one entry | The list renders. |
| 2 | Look at the bottom of the screen | There is **no footer at all** — not an empty bordered strip, not a blank band. |
| 3 | Confirm the removed text is gone | No "Stashing takes your changes out of the working copy…", and specifically no "Bringing them back is not built yet" — which was untrue anyway. |
| 4 | Force a stash failure | A footer **appears**, carrying the error, and disappears again once resolved. |

**Result:**

---

## TASK-007-T4 — Log

**Priority:** high

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the Log screen and run a search | Results stream in. |
| 2 | Look at the bottom | **No footer.** The strip is gone entirely, not left empty. |
| 3 | Press `↵` on a focused result | Still opens the commit in the side column. The hint was removed; **the behaviour was not.** |
| 4 | Press `Alt+Enter` on a focused result | Still opens its diff. |
| 5 | Note for the author | These two keyboard paths now have no on-screen hint anywhere. Flagged as the one removal that loses something — see the plan's risk section. |

**Result:**

---

## TASK-007-T5 — Rebase

**Priority:** medium

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the Rebase screen without choosing an upstream | The empty state explains what the screen will show. |
| 2 | Read it | The sentence "Nothing runs until FEAT-015 builds the Apply button." is **gone**. The sentence above it stays. |
| 3 | Confirm no work-item identifier is shown to the user | No "FEAT-015" anywhere on screen. (The Apply button's own disabled title is FEAT-015's to remove.) |

**Result:**

---

## TASK-007-T6 — Settings, and the rename

**Priority:** high

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open Settings | Five chips: You, Accounts, Behaviour, Appearance, **License**. No chip says "Advanced". |
| 2 | Select License | Heading reads "License · About". Contents unchanged — version, build, project licence, dependency licences. |
| 3 | Read the footer on any section | **No** sentence about identity being git's own configuration and where everything else is stored. |
| 4 | Confirm no empty strip | With no error, there is **no footer** on the Settings screen. |
| 5 | Force a settings write failure | A footer appears with the error. |
| 6 | Navigate to `/settings#license` | Lands on the License section. |
| 7 | Navigate to `/settings#advanced` | **Also lands on the License section** — the old link still works. |
| 8 | Navigate to `/settings#nonsense` | Lands on the default section, does not crash. |
| 9 | Navigate to `/settings#accounts` | Still lands on Accounts, as the Pull requests screen expects. |

**Result:**

---

## TASK-007-T7 — No empty bordered strips anywhere

**Priority:** high — this is the failure mode the removals could have introduced.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Visit every screen in turn with no error present | On no screen is there a bordered horizontal band at the bottom containing nothing. |
| 2 | Note any screen that has one | Record which. That is a defect of this item. |

**Result:**

---

## TASK-007-T8 — Key notation

**Priority:** high

| # | Step | Expected |
| --- | --- | --- |
| 1 | Look at the Branches entry in the nav rail | Its glyph is `⑂` — a branch mark, not `⌥`. |
| 2 | Look at the Log entry in the nav rail | Hint reads `Ctrl+F`, not `⌘F`. |
| 3 | Open the Rebase screen and hover a row's drag handle | Tooltip reads "Alt+↑ / Alt+↓". |
| 4 | Read every screen for stray `⌘` or `⌥` | None, except as covered by step 5. |
| 5 | Open the command palette **on this Linux machine** | Shortcuts read `Ctrl+…`. The platform conditional was deliberately kept; on a macOS build the same place must read `⌘`. |
| 6 | Look at the nav rail's filter field | Still shows `⌘F`. **Expected** — the whole field is removed by FEAT-030, not here. |
| 7 | Look at the toolbar's Push and Fetch | `⇧` and `⇩` unchanged — they are arrows, not the Shift key. |

**Result:**

---

## TASK-007-T9 — macOS check (deferred)

**Priority:** medium — cannot be run on this machine.

macOS is a shipped build target, and the one surviving key conditional exists for
it. This ticket is run against a macOS pre-release build.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the command palette on macOS | Shortcuts read `⌘`, not `Ctrl+`. |
| 2 | Read the nav rail's Log hint on macOS | Reads `Ctrl+F`. **Known and accepted:** only the palette is platform-aware. If this reads wrong enough to matter, it is a new item, not a TASK-007 failure. |

**Result:**

---

## TASK-007-T10 — The documentation pointer

**Priority:** medium — the file exists only to be correct.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `docs/AMENDMENTS.md` | It points at `~/Documents/constitution/AMENDMENTS.md`. |
| 2 | Check that path exists on this machine | It does, and contains the amendments book. |
| 3 | Read `docs/screens.md` on the Settings screen | Describes five sections ending in License, and records why `#advanced` still resolves. |

**Result:**
