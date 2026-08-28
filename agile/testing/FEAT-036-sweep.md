<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-036 — Manual sweep

**Item:** [`agile/items/FEAT-036-one-chip-per-branch.md`](../items/FEAT-036-one-chip-per-branch.md)

*Backfilled by TASK-013.*

---

## FEAT-036-T1 — One chip, two marks

**Priority:** high — the feature.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a repository whose current branch is pushed and level with its remote | One chip, carrying the branch name once. |
| 2 | Look at the marks | A computer glyph and a host glyph, in that order. |
| 3 | Look for the word `origin` | It is not on the screen. |
| 4 | Hover the chip | The title reads like a sentence: `main — on this machine, on origin (GitHub)`. |
| 5 | Check the current branch | Still `✓`, still the accent border. |

**Result:**

---

## FEAT-036-T2 — Divergence shows as two chips, on two rows

**Priority:** high — the case that must *not* merge.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Commit locally without pushing | The local branch chip moves up to the new commit, carrying only the computer glyph. |
| 2 | Find the remote's chip | Still on the older commit, carrying only the host glyph. |
| 3 | Push | Both land on one commit and become a single chip again. |

**Result:**

---

## FEAT-036-T3 — Every host, and every place a chip is drawn

**Priority:** medium — the breadth of the change.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open repositories on GitHub, GitLab, Bitbucket and Azure DevOps | Each host's own glyph. |
| 2 | Open one with a self-hosted remote | A plain cloud, not a guess. |
| 3 | Open one with no remote at all | Computer glyph only; nothing empty or broken. |
| 4 | Look at the All repositories cards, the stash list and a search result | Chips look the same in all of them. |
| 5 | Read the rail's branch counts | Unchanged by the merge — still one per ref. |

**Result:**

---

## FEAT-036-T4 — Two remotes, and the open question

**Priority:** medium — the case the item deliberately left open.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Add a fork as a second remote and fetch it | The branch's chip carries two host marks. |
| 2 | If both are GitHub, look at the two identical glyphs | Decide, with the case in front of you, whether the title needs to disambiguate them. Record the answer as a new item if it does. |
| 3 | Check a branch on a slashed name — `feature/x` on `origin` | Reads `feature/x`, not `x`. |

**Result:**

---

## FEAT-036-T5 — Presentation

**Priority:** medium.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Switch themes | Glyphs follow the text colour in both. |
| 2 | Change the type scale to its smallest and largest | The marks scale with the chip and stay legible. |
| 3 | Find a commit carrying several branches and tags | Chips wrap without overlapping; tags keep their notched, dashed treatment. |
| 4 | Read a chip with a screen reader | The name and the whole sentence; no glyph read as a lone character. |

**Result:**
