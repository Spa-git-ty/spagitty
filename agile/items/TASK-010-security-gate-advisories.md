<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-010 — Gate 4 fails on sixteen unmaintained advisories

**Status:** Done on `task/TASK-010-security-gate-advisories`.
**Found by:** the pipeline, the first time it ever reached gate 4.

## Problem

Gate 4 fails on every build with sixteen `cargo-deny` advisories.

**This had never been seen before**, and the reason is Amendment 16 working as
designed: gate 3 failed on every run in this repository's history, and a failed
gate stops the pipeline. TASK-005 fixed gate 3; the pipeline reached gate 4 for
the first time on PR #3 and immediately failed.

So this is not a regression. It is the next thing that was always broken,
uncovered by fixing the thing in front of it.

## What the sixteen are

**Every one is classed `unmaintained`. Not one is a vulnerability, unsound, or a
yanked release.** Verified by classifying the whole run — the only advisory type
present is `unmaintained`.

| Advisory | Crate | Why it is here |
| --- | --- | --- |
| RUSTSEC-2024-0411 … 0420 (10) | `gdk`, `gtk`, `atk`, `gdkx11`, `gtk-sys` and friends, all `0.18.2` | The gtk-rs GTK3 bindings. Tauri 2 links against them on Linux through `muda`, `tao` and `wry`. |
| RUSTSEC-2024-0370 | `proc-macro-error 1.0.4` | Build-time proc-macro expansion; not shipped in the binary. |
| RUSTSEC-2025-0075, 0080, 0081, 0098, 0100 (5) | the `unic-*` crates, `0.9.0` | Transitive, through the same tree. |

The GTK3 advisory states plainly: **"Solution: No safe upgrade is available!"**
The upstream fix is Tauri moving to GTK4. Nothing in this repository chose any
of these crates, and none can be dropped without dropping Tauri.

## The decision, and why it is not bypassing the gate

Amendment 16 says a red gate is fixed rather than bypassed, and that
`continue-on-error` is not used to get a merge through. That is not what this
does.

`cargo-deny`'s `[advisories] ignore` list exists to record **accepted, reviewed
risk**. Each advisory is listed **by its own id**, with the crate and the reason,
so that:

- a **new** advisory — including any real vulnerability — still fails the gate;
- the accepted set is visible in version control and reviewable in a diff;
- removing an entry when Tauri upgrades is a one-line change.

Verified by removing a single id and re-running: `advisories FAILED`. Restored:
`advisories ok`. The gate still does its job.

The alternative readings were considered and rejected:

- **`continue-on-error` on the job** — the thing Amendment 16 names. Makes the
  gate advisory-only and would hide a genuine vulnerability.
- **Dropping the advisories check** — same, more honestly.
- **Downgrading unmaintained to a warning globally** — closer, but it would also
  silence a *future* unmaintained crate that Spagitty itself chose, which is
  exactly the case worth failing on.

## Acceptance criteria

- `cargo deny check advisories` exits clean.
- Removing any single id from the list makes it fail again.
- `check licenses`, `check bans` and `check sources` are unaffected.
- Each entry names its crate and its reason.

## Review condition

The GTK3 block is deleted when Tauri ships a GTK4 runtime. Whoever upgrades
Tauri re-runs `cargo deny check advisories` with the block removed and keeps only
what still fires.

## Dependencies

TASK-005, without which gate 4 would still be unreachable.
