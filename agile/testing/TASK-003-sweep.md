<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-003 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

This item changes no behaviour and nothing on screen. The sweep exists to prove
exactly that — a behaviour-preserving refactor is only preserving if somebody
looked.

Use `/tmp/spagitty-fixture` from [`docs/testing.md`](../../docs/testing.md).

---

### SWEEP-003-01 — The graph still streams

- **Priority:** P1
- **Steps:** Open the fixture. Watch the Graph screen paint, then scroll to the
  bottom of the loaded window several times.
- **Expected:** Rows appear progressively rather than all at once. Each scroll
  extends the list; no commit appears twice and none is skipped. The footer's
  count rises and settles at the repository's real commit count.
- **Result:**

### SWEEP-003-02 — Outside changes still arrive, once

- **Priority:** P1
- **Steps:** With the app open on the Graph screen, run `git commit -q --allow-empty -m "from the terminal"`
  in the fixture. Then run three commits in a row.
- **Expected:** The graph refreshes. The three-in-a-row case refreshes once
  after they finish, not three times mid-write, and never flickers repeatedly
  with the app idle.
- **Result:**

### SWEEP-003-03 — Switching repositories

- **Priority:** P1
- **Steps:** Open a second repository from the All repositories screen, then go
  back to the first.
- **Expected:** Each switch is prompt — no pause of a second or more while the
  previous walk winds down — and the graph shown is the one for the repository
  named in the title bar.
- **Result:**

### SWEEP-003-04 — Everything that runs a worker

- **Priority:** P1
- **Steps:** Run one fetch, one push against a throwaway remote, one interactive
  rebase, one clone and one log search.
- **Expected:** Progress is reported for each, and each ends with its own result
  rather than silence. These four workers changed signature and nothing else, so
  a failure here is a compile-time change with a runtime consequence.
- **Result:**

### SWEEP-003-05 — The recent repositories list is intact

- **Priority:** P2
- **Steps:** Check `~/.config/<app>/repositories.json` (or the platform
  equivalent) before and after running `cargo test --workspace`.
- **Expected:** Unchanged. The tests point `HOME` at a temporary directory; a
  test run must not add rows to the list of repositories you have opened.
- **Result:**

### SWEEP-003-06 — Settings still persist

- **Priority:** P2
- **Steps:** Toggle a setting, quit, reopen.
- **Expected:** The toggle is where it was left. `settings::load` and `save`
  changed signature too.
- **Result:**
