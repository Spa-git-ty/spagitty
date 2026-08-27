<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-015 — Manual sweep

**Item:** [`agile/items/BUG-015-backend-list-disarms-the-safe-renderer.md`](../items/BUG-015-backend-list-disarms-the-safe-renderer.md)

**Preconditions for every ticket:** a Linux host with a Wayland session, a
build of `bugfix/BUG-015-backend-list-disarms-renderer`, and a terminal from
which the binary can be started with a modified environment.

---

## BUG-015-T1 — The reported failure is gone

**Priority:** high — this is the report.

| # | Step | Expected |
| --- | --- | --- |
| 1 | `GDK_BACKEND=wayland,x11,* ./spagitty` from a Wayland session | The window opens and paints. |
| 2 | Read the terminal | No `Error 71 (Protocol error) dispatching to Wayland display`. |
| 3 | Leave it open for a minute, scroll the graph, resize the window | It keeps painting. A window that paints once and goes transparent is the XWayland failure, not this one — record it if seen. |
| 4 | Check the environment the process actually got: `tr '\0' '\n' < /proc/$(pgrep -n spagitty)/environ \| grep DMABUF` | `WEBKIT_DISABLE_DMABUF_RENDERER=1`. |

**Result:**

---

## BUG-015-T2 — The escape hatch still works

**Priority:** high — the behaviour the fix had to preserve.

| # | Step | Expected |
| --- | --- | --- |
| 1 | `GDK_BACKEND=x11 ./spagitty` | The application starts on XWayland. |
| 2 | Check the environment as in T1 step 4 | `WEBKIT_DISABLE_DMABUF_RENDERER` is **not** set — nothing was done to the choice. |
| 3 | Watch the window for a minute | It may paint and then lose its buffer. That is the known XWayland behaviour from FEAT-055, not a regression from this fix. |
| 4 | `WEBKIT_DISABLE_DMABUF_RENDERER=0 ./spagitty` on Wayland | Still honoured: the variable is left at `0`. |

**Result:**

---

## BUG-015-T3 — The unset case is unchanged

**Priority:** medium — the default path every user takes.

| # | Step | Expected |
| --- | --- | --- |
| 1 | `env -u GDK_BACKEND ./spagitty` on Wayland | Window opens and keeps painting. |
| 2 | Check the environment | `WEBKIT_DISABLE_DMABUF_RENDERER=1`, `WEBKIT_FORCE_COMPOSITING_MODE=1`. |
| 3 | Compare against a build of `356142f` with the same command | Identical behaviour. This fix must be invisible when the variable is unset. |

**Result:**

---

## BUG-015-T4 — An X11 session is untouched

**Priority:** medium — the branch that returns before any of this.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Log into a real X11 session (no `WAYLAND_DISPLAY`) and start the application | It opens. |
| 2 | Check the environment | `WEBKIT_DISABLE_DMABUF_RENDERER` not set; `WEBKIT_FORCE_COMPOSITING_MODE=1`. |
| 3 | Repeat with `GDK_BACKEND=wayland,x11,*` exported | Same as step 2 — the list changes nothing on a session that was never Wayland. |

**Result:**

---

## BUG-015-T5 — A second host, because one machine is not a measurement

**Priority:** low, and it is the ticket that ages best.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Repeat T1 on a host with a different GPU driver — AMD or Intel rather than NVIDIA | The window paints. |
| 2 | Note the driver, the compositor and the distribution in the result field | Written down, because FEAT-055's table was measured on one machine and this is the second row of it. |
| 3 | If the accelerated path works there, try `WEBKIT_DISABLE_DMABUF_RENDERER=0` | Record whether it survives a minute. A host where it does is the case the escape hatch exists for. |

**Result:**
