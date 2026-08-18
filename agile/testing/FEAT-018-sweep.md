<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-018 — Manual sweep

**Item:** [`agile/items/FEAT-018-fetch-and-push.md`](../items/FEAT-018-fetch-and-push.md)

*Backfilled by TASK-013. These are the only tests that touch a network, so run
them against a scratch repository and a remote you own.*

---

## FEAT-018-T1 — Fetch

**Priority:** high.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Push a commit to the remote from elsewhere; click Fetch | It reports success, and the new remote-tracking ref appears on the graph. |
| 2 | Open the Branches screen | Ahead/behind counts reflect the fetch. |
| 3 | Turn on "Show the git command behind each action" and fetch again | The log shows `git fetch --prune --progress --all`. |
| 4 | **Delete a branch on the remote, then fetch** | Its remote-tracking ref disappears **without being asked**. This is the known gap: pruning is unconditional. Confirm nothing local was touched. |

**Result:**

---

## FEAT-018-T2 — Push

**Priority:** high — the first thing other people can see.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Commit locally on a branch that has an upstream; click Push | It reports success; the remote has the commit. |
| 2 | Push again with nothing to push | It says so; nothing is written. |
| 3 | Have someone else push first, then push | Rejected, with git's own message shown as a sentence. Nothing local changed. |
| 4 | Look for any force option in the interface | **There is none, anywhere.** That is deliberate. |

**Result:**

---

## FEAT-018-T3 — A branch with no upstream

**Priority:** high — the case everyone meets, and the one still owed.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Create a branch, commit, click Push | Today: it fails with git's "no upstream branch" message. |
| 2 | Read the message | Decide whether a person could act on it as shown. |
| 3 | Set the upstream from a terminal and push again | Works. |

Step 1's behaviour is the deferred half of the item, not a regression. Record
what the message actually looks like — it is the input to building the offer.

**Result:**

---

## FEAT-018-T4 — Credentials fail rather than hang

**Priority:** high — a hang is the worst outcome, and nothing automated covers
this.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Point a remote at a URL needing credentials the machine does not have; click Fetch | It **fails**, with a message. It does not hang, and no terminal prompt appears anywhere. |
| 2 | Click Push against the same remote | The same. |
| 3 | Watch the window while it happens | The app stays responsive. |

**Result:**

---

## FEAT-018-T5 — Several remotes

**Priority:** medium — the other deferred half.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Add a second remote and click Fetch | Both are fetched — the button means all remotes. |
| 2 | Look for a way to fetch just one | There is none. Deferred, not broken. |
| 3 | Click Push | It pushes the current branch to its own upstream, not to both. |

**Result:**
