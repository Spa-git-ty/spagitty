<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-068 — Manual sweep

**Item:** [`agile/items/FEAT-068-external-diff-merge-tools.md`](../items/FEAT-068-external-diff-merge-tools.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT068-01 | A repository is open | 1. Navigate to Settings (1K)<br>2. Click `External Tools` section chip | External Tools section opens showing detected tools on `$PATH` and current `diff.tool`/`merge.tool` values | P1 | Pass |
| SWEEP-FEAT068-02 | External Tools section is open | 1. Select an installed diff tool (e.g. `VS Code` or `Meld`) from the dropdown | `diff.tool` is saved to git configuration and confirmation toast appears | P1 | Pass |
| SWEEP-FEAT068-03 | Diff screen (1B) or Working copy (1C) is open with changed files | 1. Right-click any file in the file list<br>2. Select `Open in External Diff Tool` | The configured external diff tool is spawned in a detached process comparing revisions | P1 | Pass |
| SWEEP-FEAT068-04 | External Tools section is open | 1. Check `Save changes to global git config (~/.gitconfig)`<br>2. Change merge tool | Tool is written to `~/.gitconfig` with global scope | P2 | Pass |
