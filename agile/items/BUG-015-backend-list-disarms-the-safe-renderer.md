<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-015 — A backend preference list disarms the safe renderer

**Status:** Fixed on `bugfix/BUG-015-backend-list-disarms-renderer`.

*This is the fifteenth bug and not the thirteenth. The thirteenth was already
spent: `c071e76` fixed a defect in passing and cited that identifier in a source
comment without ever writing the item. Amendment 12 forbids reusing a number, so
it stays spent, and its record is written on a branch of its own.*
**Screens:** none — the window never reaches one.
**Found by:** the author, running the application on a host whose session
exports `GDK_BACKEND` by default.

## Reproduction

1. On a Wayland session, export a backend *preference list* rather than a single
   backend — `GDK_BACKEND=wayland,x11,*`, which several distributions set for
   every process in the session.
2. Start Spagitty.

## Observed

The process dies before it paints:

```
Error 71 (Protocol error) dispatching to Wayland display
```

## Expected

The window opens on the software path, exactly as it does when `GDK_BACKEND` is
unset. Nothing in that session asked for anything different.

## Environment

Linux, Wayland, WebKitGTK through Tauri 2. The failure needs only the variable;
it is not driver-specific, because the variable is what decides which renderer
is attempted in the first place.

## Cause

FEAT-055 wrote the rendering policy as a pure function, and gave it this rule:

```rust
// An explicit backend is somebody's decision. Leave it, and leave the
// renderer to whatever they said about it too.
if backend.is_some() {
    return out;
}
```

The reasoning is sound and the test is wrong. `GDK_BACKEND=x11` *is* a decision:
somebody is asking for XWayland, and disabling the DMABuf renderer underneath
them would take away the accelerated path they asked for. But `GDK_BACKEND` does
not hold a backend — it holds a **preference list**, "try these in order", and a
session that exports `wayland,x11,*` has expressed no preference at all.

Reading presence as intent therefore returned early for a whole class of hosts,
skipped `WEBKIT_DISABLE_DMABUF_RENDERER=1`, and left them on the one path
FEAT-055 measured as fatal. The window died at the first frame, which is the
same failure BUG-004 fixed and this quietly reintroduced for anyone whose
distribution sets the variable.

## Fix

Match the value, not its presence:

```rust
if backend == Some("x11") {
    return out;
}
```

A bare `x11` keeps its meaning. Everything else — a list, a bare `wayland`, an
empty value — falls through to the safe renderer, which is what an unset
variable already did.

The module's own documentation said "left alone when the environment already has
an opinion", which is now narrower and says so: an opinion is a bare `x11`, not
any value at all.

## Acceptance criteria

- `GDK_BACKEND=wayland,x11,*` on a Wayland session still gets
  `WEBKIT_DISABLE_DMABUF_RENDERER=1`.
- `GDK_BACKEND=x11` still gets nothing done to it.
- An unset `GDK_BACKEND` is unchanged from FEAT-055.
- The policy is still a pure function with a test per row, not a running window.

## Non-scope

The rendering path itself. FEAT-055's measurement and its choice of default
stand; this item only fixes which environments are read as having chosen
something else.

## Dependencies

FEAT-055, which introduced the rule. BUG-004, whose workaround this bug was
silently switching off.
