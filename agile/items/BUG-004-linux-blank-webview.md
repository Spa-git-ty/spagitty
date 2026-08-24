# BUG-004 — The packaged Linux app opens a blank white window

**Status:** Fixed, awaiting sweep
**Branch:** `bugfix/BUG-004-linux-blank-webview`

## Problem

Launching the packaged AppImage on Linux opens a window that stays white. The
UI never paints — not slowly, not partially: the session is dead on arrival.
stderr carries the cause twice, once per attempted frame:

```
Failed to create GBM buffer of size 1280x800: Invalid argument
```

WebKitGTK's DMABuf renderer asks the driver for a GBM buffer, the driver
refuses, and WebKit has no frame to present. The application code is fine; the
window it draws into never receives anything.

Setting `WEBKIT_DISABLE_DMABUF_RENDERER=1` in the launching shell fixes it,
which is how the workaround was already documented in `docs/testing.md` for
development runs. That is not something a user of a packaged build should have
to know, and a user who does not know it sees a broken application.

## Reproduction

1. Build the release AppImage.
2. Run `./Spagitty.AppImage` from a shell with no WebKit variables set, on a
   driver and compositor combination whose GBM allocation WebKit's DMABuf path
   cannot satisfy (reported on Wayland, Linux 7.1.8-arch1-3).
3. The window opens white and stays white; stderr shows the GBM line above.

**Observed:** blank white window for the whole session.
**Expected:** the Graph screen paints, as it does when the variable is set.

## Scope

- Set the variable from inside the process, so a bare launch works.
- Respect a value the environment already carries, in either direction.

## Non-scope

- Detecting which drivers can serve the DMABuf path and keeping it where it
  works. The renderer is disabled on Linux unconditionally; see the plan for
  the cost of that and why it was accepted.
- The unrelated `im-ibus.so: cannot open shared object file` GTK warning on the
  same stderr. That is a missing input-method module on the host, it is
  cosmetic, and the application does not ship input methods.

## Acceptance criteria

- A Linux launch with no WebKit variables set paints the UI.
- `WEBKIT_DISABLE_DMABUF_RENDERER=0` in the environment still reaches WebKit
  unchanged, so the accelerated path stays reachable on hardware that has it.
- Non-Linux targets are untouched.
- Tests cover both the defaulting and the deferring behaviour.

## Dependencies

None. The defect predates every feature branch and is independent of them.
