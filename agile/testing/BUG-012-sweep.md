<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-012 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-012-01 — The window still moves while a request is in flight

- **Priority:** P1
- **Steps:** Make a request that will not answer. The simplest is a host that
  accepts a connection and says nothing — `nc -l 443` on a machine you point the
  Host field at — or connect an account and then pull the network cable mid
  request. While it is in flight: scroll the graph, switch screens, resize the
  window.
- **Expected:** All of it works. The request gives up after its timeout and
  reports; the window was never frozen and the compositor never offered to
  terminate it.
- **Result:**

### SWEEP-012-02 — Startup is not blocked by the update check

- **Priority:** P1
- **Steps:** Disconnect the network entirely, then start Spagitty with the
  update check on.
- **Expected:** The window opens and is usable **immediately**. It does not wait
  for the check to time out. This is the case that produced "Application Not
  Responding".
- **Result:**

### SWEEP-012-03 — Connecting an account does not freeze the screen

- **Priority:** P1
- **Steps:** Settings → Accounts, enter a host that is slow or unreachable, and
  press Connect.
- **Expected:** The Settings screen stays interactive while it tries. The failure
  arrives as a message.
- **Result:**
