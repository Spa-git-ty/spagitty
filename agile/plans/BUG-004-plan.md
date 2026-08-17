<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-004 — Plan

## Approach

The fix has to reach WebKit before its first frame, and it has to reach it
without the user's help. Three places could carry it.

**A launcher wrapper** — an `AppRun` script for the AppImage that exports the
variable and then execs the binary — is the packaging-level answer. It only
covers the AppImage: the `.deb`, a `cargo run`, and a binary invoked directly
all keep the bug, and the fix lives in a file the Rust code cannot test.

**A Tauri configuration knob** does not exist. WebKitGTK reads this from the
process environment; there is nothing in `tauri.conf.json` that sets it.

**The process sets it on itself**, first thing in `run`, before the builder and
before any thread exists. That is what shipped. Every launch of every package
format is covered by construction, the decision is ordinary Rust and therefore
testable, and there is no second file to keep in step with the first.

`std::env::set_var` is only sound while the process is single-threaded, which is
why the call is the first statement in `run` rather than inside `.setup()` —
by setup time Tauri has already started threads, and WebKit has already read
its environment anyway.

## The cost, stated plainly

The renderer is disabled on **all** Linux hosts, including those whose drivers
serve the DMABuf path correctly. Those hosts lose a zero-copy compositing path
and repaint through shared memory instead, which is measurably slower.

That trade was taken deliberately: the failure it prevents is a white window and
an unusable application, and the cost it pays is frame throughput on a desktop
git client that is not animating anything. Feature-detecting the working case
means allocating a GBM buffer to see whether allocation works, before the
webview exists — the probe is the bug. An escape hatch covers the people who
want the fast path: an explicit `WEBKIT_DISABLE_DMABUF_RENDERER=0` is left
untouched, so the accelerated renderer stays one variable away.

## Files

| File | Change |
| --- | --- |
| `src-tauri/src/platform.rs` | New. The decision, the process-level apply, and their tests. |
| `src-tauri/src/lib.rs` | Declares the module; calls `prepare_webview()` as the first statement of `run`. |
| `docs/testing.md` | The workaround is no longer the reader's job for a packaged run. |
| `docs/architecture.md` | Records that the host shell owns pre-webview environment. |

The decision is split from the side effect — `dmabuf_renderer_setting` is a pure
function of what the environment already says, `prepare_webview` is the only
thing that writes. That is what makes the "an explicit value wins" rule
assertable without a subprocess.

## Steps

1. `platform.rs` with the pure decision and the cfg-gated apply.
2. Wire it into `run` ahead of the builder.
3. Tests: default, both explicit values, empty value, and the process-level
   effect on Linux.
4. Reconcile `docs/`, write the `agile/` triplet.

## Risk

- **The variable arrives too late.** Guarded by call position, not by hope: it
  is the first statement in `run`, before `tauri::Builder`.
- **Someone later moves the call into `.setup()`** because that reads tidier,
  and the bug returns silently — the window would still be white with no
  compile error. The comment at the call site says why the position matters, and
  `the_process_environment_carries_the_setting` fails if the call stops
  happening at all.
- **A future WebKitGTK fixes the DMABuf path** and this becomes a permanent
  performance tax. Then the default flips here, in one function, with the tests
  next to it.

## Rollback

Drop the `platform::prepare_webview()` call. The module is inert without it and
nothing else depends on it.
