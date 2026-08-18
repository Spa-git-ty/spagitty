<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-033 — Branch divergence on the chip

**Status:** Backlog. No plan yet; one is written when the work starts.
**Screen:** Graph (1A), and everywhere else `RefChip` is drawn.
**Recorded by:** TASK-012, which found this identifier cited by FEAT-036 with no
document behind it.

## Problem

A branch chip on the graph says where a branch lives — on this machine, on a
remote, on both — and nothing about whether the two have moved apart. The
Branches screen already answers that: `BranchRow` carries `ahead` and `behind`,
counted in `crates/gitlumiere-core/src/branches.rs` against the remote-tracking
ref on disk, and `BranchTable` shows them in an `ahead / behind` column.

So the graph shows one chip for `main` and `origin/main` (FEAT-036) while
silently implying they are the same commit, which is exactly when they are not
worth conflating. The person looking at the graph is the person about to push or
pull.

## Scope

- `RefChip` carries the divergence for a branch that has an upstream, and draws
  it — the counts, or a mark that says "these have moved apart".
- The graph's ref payload gains the counts. Today `refs` on a commit row are
  built from the refs pointing at it; the counts come from a different read
  (`branches`), so this is a data question before it is a presentation one.
- Level branches say nothing. A chip that shows `0 / 0` is noise on every row.
- The `title` keeps carrying the whole sentence, so nothing is glyph-only.

## Non-scope

- **Fetching.** The counts are as old as the last fetch, exactly as on the
  Branches screen, and this item does not touch the network. Telling a person
  how old the number is belongs to whatever shows when the last fetch was.
- Tags. They have no upstream to diverge from.
- Any change to how the counts are computed. The backend read is built and
  tested.

## Acceptance

- A branch whose local and upstream tips differ shows how far, on the chip, on
  the graph.
- A level branch, a branch with no upstream, and a tag are all unchanged.
- The counts on the chip and the counts on the Branches screen never disagree —
  they come from one read, not two.

## Dependencies

FEAT-036, which made one chip per branch and is where the space for this comes
from. FEAT-004's branch read, which already produces the counts.

## Note on the record

FEAT-035's dependency section cites `FEAT-033` as "extracts the column store".
That is not this item and never happened under this identifier: the column store
was extracted in FEAT-022 (`7299551`), before FEAT-035 was written. The citation
here in FEAT-036 — divergence on the chip — is the meaning this identifier
keeps.
