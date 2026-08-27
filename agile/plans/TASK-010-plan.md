<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-010 — Plan

**Item:** [`agile/items/TASK-010-security-gate-advisories.md`](../items/TASK-010-security-gate-advisories.md)
**Branch:** `task/TASK-010-security-gate-advisories`
**Status:** implemented.

## Approach

Classify first, then decide. The question that governs everything here is
whether any of the sixteen is a real vulnerability, because that would make this
a code problem rather than a policy one.

None is. The whole run was parsed and every advisory is `unmaintained` — no
`vulnerability`, no `unsound`, no yanked release. Eleven are the GTK3 bindings
Tauri links against on Linux, whose advisory says outright that no safe upgrade
exists; the rest are transitive build-time crates from the same tree.

With that established, the honest response is to record the accepted set in
`deny.toml`'s `ignore` list, **one id at a time**, each with its crate and its
reason.

### Why this is a fix and not a bypass

Amendment 16 forbids `continue-on-error` and skipping. The distinction that
matters is whether the gate can still fail:

| Approach | New vulnerability still caught? |
| --- | --- |
| `continue-on-error` on the job | **No** |
| Drop the advisories check | **No** |
| `unmaintained = "warn"` globally | Only if it is not `unmaintained` — a future unmaintained crate we *chose* would pass silently |
| **Explicit id list** | **Yes** — anything not listed fails |

Only the last keeps the gate meaningful, which is why it is the one taken.

**Proven, not asserted.** Removing `RUSTSEC-2024-0413` from the list and
re-running gives `advisories FAILED`; restoring it gives `advisories ok`.

## Files

`deny.toml` only — the `[advisories]` section gains an `ignore` list and the
paragraph explaining why gate 4 had never run before.

## Risk

**The real risk is the list rotting into a blanket allowance.** Someone hitting
a new advisory could append an id without reading it, and the gate degrades one
line at a time into the `continue-on-error` this avoided.

Mitigated by the comment block: it states that every entry needs a crate and a
reason, names the review condition (Tauri moving to GTK4), and records that only
`unmaintained` advisories are accepted here. A vulnerability arriving in this
list would contradict the file's own text.

## Verification

```
cargo deny --all-features --manifest-path ./Cargo.toml check advisories   # ok
cargo deny --all-features --manifest-path ./Cargo.toml check licenses     # ok
cargo deny --all-features --manifest-path ./Cargo.toml check bans sources # ok
```
