<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-010 — Manual sweep

**Item:** [`agile/items/TASK-010-security-gate-advisories.md`](../items/TASK-010-security-gate-advisories.md)

This item has no interface. The sweep is a reviewer reading the diff and running
the tool, because the risk here is a policy decision rather than a defect.

---

## TASK-010-T1 — The gate passes, and still can fail

**Priority:** high

| # | Step | Expected |
| --- | --- | --- |
| 1 | `cargo deny --all-features --manifest-path ./Cargo.toml check advisories` | `advisories ok` |
| 2 | Delete any one id from the `ignore` list and re-run | `advisories FAILED` |
| 3 | Restore it and re-run | `advisories ok` |
| 4 | Run `check licenses`, `check bans`, `check sources` | All ok. This item touched only `[advisories]`. |

**Result:**

---

## TASK-010-T2 — Read the list as a reviewer

**Priority:** high — this is the ticket, not step 1.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `deny.toml` and read the `[advisories]` comment | It explains why gate 4 had never run, and what the sixteen are. |
| 2 | Check every entry has a crate name beside it | All sixteen do. |
| 3 | Look for any entry that is **not** `unmaintained` | There must be none. A vulnerability in this list is a defect. |
| 4 | Confirm there is no blanket setting | No `unmaintained = "warn"`, no `continue-on-error` in `gates.yml`. |
| 5 | Check the review condition is written down | It is: the GTK3 block goes when Tauri moves to GTK4. |

**Result:**

---

## TASK-010-T3 — On the pull request

**Priority:** high

| # | Step | Expected |
| --- | --- | --- |
| 1 | Watch gate 4 on the PR | Passes. |
| 2 | Watch gates 5 and 6 | They **run at all** — the first time in this repository's history that the pipeline gets past gate 4. |
| 3 | If gate 5 or 6 fails | That is a new finding, not a failure of this item. File it. |

**Result:**
