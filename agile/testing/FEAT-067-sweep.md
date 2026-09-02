<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-067 — Manual sweep

**Item:** [`agile/items/FEAT-067-submodules-management.md`](../items/FEAT-067-submodules-management.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT067-01 | A repository containing submodules is open | 1. Click `Submodules <count>` in the sidebar rail footer<br>2. Or trigger `Submodules…` from Command Palette | Submodules modal opens displaying all declared submodules with status pills and URLs | P1 | Pass |
| SWEEP-FEAT067-02 | Submodules modal is open with uninitialized submodules | 1. Click `Update All (Recursive)` | All submodules are recursively cloned and checked out at their recorded commit SHAs | P1 | Pass |
| SWEEP-FEAT067-03 | Submodules modal is open with an initialized submodule | 1. Click `Open as Repo` on a submodule row | Spagitty switches the active session to the submodule directory in a new tab | P1 | Pass |
| SWEEP-FEAT067-04 | Submodules modal is open | 1. Click `Sync URLs` | Submodule remote URLs are re-synchronized against `.gitmodules` definitions | P2 | Pass |
| SWEEP-FEAT067-05 | Submodules modal is open | 1. Click `Deinit` on an initialized submodule | Submodule working directory is de-initialized and status pill updates to `uninitialized` | P2 | Pass |
