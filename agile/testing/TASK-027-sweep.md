<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-027 — Sweep

**Item:** [`agile/items/TASK-027-migrate-the-js-toolchain-to-bun.md`](../items/TASK-027-migrate-the-js-toolchain-to-bun.md)

## What a human checks at the window

Swift, per Amendment 4: the wheel stays with the author; the checklist is what
verification the automated suite cannot run.

1. **The dev loop.** `bun run dev` opens the app onto a fixture with
   `bun run tauri dev -- -- -- /tmp/spagitty-fixture` and hot-reloads a trivial
   copy edit. The point is that *nothing re-triggers node* on the way.
2. **The license page.** Settings's "About / Licenses" renders two JS entries
   (`@tauri-apps/api`, `@tauri-apps/plugin-dialog`) under the npm heading,
   alongside the Rust half — the same two as before the change.
3. **A network path.** An update check or clone still completes. Those calls go
   through Rust/TLS and never used node, so this is a sanity trip-wire rather
   than a new claim.
4. **The launch script.** Running an admin job (`run_claude_job.sh`) still
   reaches bun through `mise` with no nvm entry on `PATH`.

## What this sweep cannot say

Whether any *visual* behaviour differs — but nothing that renders changed, so
there is nothing to look at beyond the routine glance in (1) that the window
comes up correctly.

Closes TASK-027 once the branch is merged via pull request.