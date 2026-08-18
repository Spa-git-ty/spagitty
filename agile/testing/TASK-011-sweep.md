<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-011 — Manual sweep

**Item:** [`agile/items/TASK-011-secret-scanning-never-ran.md`](../items/TASK-011-secret-scanning-never-ran.md)

*Backfilled by TASK-013.*

---

## TASK-011-T1 — The scanner actually runs

**Priority:** high — the whole item is that it did not.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a pull request and let the pipeline reach gate 4 | The secrets step runs. |
| 2 | Read its log | A commit count and a byte count — evidence of a scan, not a licence message. |
| 3 | Look for `is an organization. License key is required` | It is not there. |
| 4 | Check the version in the log against the pin in `gates.yml` | They match. |

**Result:**

---

## TASK-011-T2 — A committed secret fails the gate

**Priority:** high — the only check that tells a live gate from a decorative one.

| # | Step | Expected |
| --- | --- | --- |
| 1 | On a scratch branch, commit a plausible fake credential (an AWS-shaped key is what the default rules catch) | |
| 2 | Push and let gate 4 run | **Red.** The step fails and the pipeline halts. |
| 3 | Read the log | The finding names the file and commit, and the secret itself is **redacted**. |
| 4 | Commit a second change removing the secret, and push again | Still red: `detect` walks history, and the secret is still in the objects. |
| 5 | Delete the scratch branch | Do not merge any of it. |

**Result:**

---

## TASK-011-T3 — Gate order still halts

**Priority:** medium — Amendment 16's behaviour, which hid this defect for weeks.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Break something gate 3 checks and push | Gate 3 red, and gate 4 does **not** run. |
| 2 | Confirm nothing reports the security gate as passing | A gate that did not run is not a gate that passed. |
| 3 | Fix gate 3 and push | Gate 4 runs again. |

**Result:**

---

## TASK-011-T4 — A false positive is recorded, not silenced

**Priority:** medium — the pressure that would undo this item.

| # | Step | Expected |
| --- | --- | --- |
| 1 | When the scanner flags something that is genuinely not a secret, look at what would silence it | An explicit, fingerprinted exception with a reason — the shape `deny.toml` uses for advisories. |
| 2 | Confirm `continue-on-error` appears nowhere in gate 4 | Amendment 16 forbids it, and it is how this gate became decorative the first time. |

**Result:**
