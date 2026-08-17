<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-004 — Manual sweep

Test tickets for the blank Linux window.

**What this is.** The packaged app opened white on Linux because WebKitGTK's
DMABuf renderer could not allocate a GBM buffer and therefore presented no
frame. The process now sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` on itself before
the webview starts, unless the environment already carries a value.

**Where to run it.** On the host that reported the bug — a driver and compositor
combination whose GBM allocation WebKit's DMABuf path cannot satisfy. On a host
where the bug never reproduced, SWEEP-004-01 passes for the wrong reason and
proves nothing; run 03 and 04 there instead.

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-004-01 — The bare launch, which is the reproduction

- **Priority:** P1
- **Preconditions:** A release AppImage built from this branch. A shell with no
  `WEBKIT_*` variables set — check with `env | grep WEBKIT` and expect nothing.
- **Steps:**
  1. `./GitLumiere.AppImage`
  2. Wait for the window, then open any repository.
- **Expected:** The UI paints. No white window at any point beyond the normal
  startup frame, and `Failed to create GBM buffer` does not appear on stderr.
- **Result:**

### SWEEP-004-02 — The old workaround still works, and is now redundant

- **Priority:** P2
- **Steps:** `WEBKIT_DISABLE_DMABUF_RENDERER=1 ./GitLumiere.AppImage`
- **Expected:** Identical behaviour to SWEEP-004-01. Setting by hand what the
  app now sets itself changes nothing and breaks nothing.
- **Result:**

### SWEEP-004-03 — The escape hatch is real (negative path)

- **Priority:** P1
- **Steps:** `WEBKIT_DISABLE_DMABUF_RENDERER=0 ./GitLumiere.AppImage`
- **Expected:** The app does **not** override the choice. On the reporting host
  that means the bug comes back — a white window and the GBM line on stderr,
  which is the correct outcome and proves the value was respected. On a healthy
  host the app runs normally through the accelerated renderer.
- **Result:**

### SWEEP-004-04 — Development run, no variable in the command

- **Priority:** P2
- **Steps:** `npm run tauri dev -- -- -- /tmp/gitlumiere-fixture`, with no
  `WEBKIT_DISABLE_DMABUF_RENDERER` in the command and none in the shell.
- **Expected:** The window paints onto the fixture. The workaround that
  `docs/testing.md` used to require for this command is no longer needed.
- **Result:**

### SWEEP-004-05 — Every packaged format, not only the AppImage

- **Priority:** P2
- **Steps:** Install and launch each artifact the release build produces (`.deb`
  and AppImage at minimum), launched from a desktop entry rather than a shell so
  nothing inherits a helpful environment.
- **Expected:** Each one paints. The fix is inside the binary, so the launch
  route cannot matter — this ticket is checking that claim, not assuming it.
- **Result:**

### SWEEP-004-06 — A long session, not just a first frame

- **Priority:** P2
- **Steps:** With the app open from SWEEP-004-01: switch repository tabs, open
  the diff screen, scroll a long history, resize the window, minimise and
  restore.
- **Expected:** Everything repaints throughout. The shared-memory path is slower
  than DMABuf by design; watch for tearing, a frozen region, or a pane that
  stays blank after a resize, and report the exact action if one appears.
- **Result:**

### SWEEP-004-07 — The ibus warning is still cosmetic

- **Priority:** P3
- **Steps:** Read stderr from SWEEP-004-01. Type into the commit message box and
  into the search field.
- **Expected:** `im-ibus.so: cannot open shared object file` may still appear —
  it is a missing host input-method module, explicitly out of scope for this
  item — and typing works regardless. Report a failure only if text input is
  actually broken.
- **Result:**
