<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-014 — Manual sweep

**Item:** [`agile/items/BUG-014-conflicts-footer-says-resolving-is-not-built.md`](../items/BUG-014-conflicts-footer-says-resolving-is-not-built.md)

**Preconditions for every ticket:** a build of `bugfix/BUG-014-conflicts-footer`
and a repository put into a conflicted state — a merge or a rebase that stops on
a file both sides changed.

---

## BUG-014-T1 — The screen no longer contradicts itself

**Priority:** high — the report.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the Conflicts screen with at least one conflicted file | |
| 2 | Read the bottom of the screen | No footer. No sentence about the screen only reading. |
| 3 | Search the visible text for "not built" | Not there. |
| 4 | Resolve a file by taking a whole side | It resolves. Nothing on screen claims that is unavailable. |

**Result:**

---

## BUG-014-T2 — Nothing was lost with the footer

**Priority:** high — the footer did carry one true fact, and the header has to still carry it.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Look at the header while an operation is in progress | It names the operation — "rebase in progress" — and the file count. |
| 2 | Find the way out | An Abort button, named after the real operation. |
| 3 | Click Abort and read the confirmation | It says what comes back, for that operation specifically. |
| 4 | Cancel the confirmation | Nothing happened. |

**Result:**

---

## BUG-014-T3 — The layout survives the missing row

**Priority:** medium — removing a fixed-height element usually shows up somewhere else.

| # | Step | Expected |
| --- | --- | --- |
| 1 | With conflicts open, look at the bottom edge of the panes | They reach the status strip. No stripe of empty background where the footer was. |
| 2 | Resize the window short and tall | The panes take the space. Nothing overlaps the status strip. |
| 3 | Visit with no conflicts at all | The empty state reads normally, with no gap under it. |
| 4 | Switch theme | No stray border or shadow where the footer's top edge used to be. |

**Result:**

---

## BUG-014-T4 — The document matches the screen

**Priority:** medium — the same false claim lived in `docs/screens.md`, and a fix that leaves it there fixes half the bug.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Read the 1D section of `docs/screens.md` | It describes a screen that resolves. No "deferred to FEAT-016". |
| 2 | Find the read-only claim | Narrowed to reading, and attributed to the test that proves it. |
| 3 | Check the claim against the code: does resolving write? | Yes — `write_merged`, `take` and `mark_resolved` in `crates/spagitty-core/src/conflicts.rs`. The document says so. |
| 4 | Run `cargo test -p spagitty-core conflicts` | Green, including `reading_every_side_never_writes_to_the_repository`. |

**Result:**
