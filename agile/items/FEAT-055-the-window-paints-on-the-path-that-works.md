<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-055 — The window paints on the path that works

**Status:** Done.
**Raised by:** the author, using the application: "the UI and the app is SLOW,
resize takes time, scroll takes time and low fps if I can say how it feels."

## Problem

Spagitty renders in software on Linux, and had stopped saying so.

BUG-004 set `WEBKIT_DISABLE_DMABUF_RENDERER=1` on every Linux start, because
WebKitGTK's DMABuf renderer cannot allocate a GBM buffer on some driver and
compositor combinations and the window then stays blank for the whole session.
The cost was written down at the time — "every Linux host repaints through
shared memory" — and then stopped being read. Every blur, shadow, gradient and
scrolled row in the interface is rasterized on the CPU, on every host, including
the ones that never had the bug.

## What was measured

A real window on a Wayland session with an NVIDIA driver, captured twice per run
because the failure is *delayed* — the window paints first and loses its buffer
afterwards, so a single screenshot proves nothing:

| session  | DMABuf renderer | t=8s | t=32s |
|----------|-----------------|------|-------|
| Wayland  | on              | `Error 71 (Protocol error)`, process dies | — |
| XWayland | on              | paints (19.5k colours) | 572k colours — the desktop showing through a dead buffer |
| Wayland  | off             | paints (23.5k colours) | 21.2k — still painting |

Retested after a driver update, with the same result.

## Change

The policy moves into a pure function in `platform.rs` with a test per row of
that table, so it can be read rather than inferred from one person's window.
The default stays the path that paints. `WEBKIT_FORCE_COMPOSITING_MODE=1` is
set as well, and both accelerated paths stay reachable for a host whose driver
serves them — `WEBKIT_DISABLE_DMABUF_RENDERER=0`, plus `GDK_BACKEND=x11` for
XWayland.

Since the paint is on the CPU, the interface stops asking for so much of it.
Blur — `backdrop-filter` — had spread to fifty-four elements, including every
button and chip, plus a full-window layer that was blurred *and* animated. It is
now on five things, all of which float over content and appear one at a time.
Shadows are two layers each with no radius past 24px, and the primary button's
halo stopped breathing: a Gaussian blur sixty times a second, forever, for an
effect the eye reads as a glow either way.
