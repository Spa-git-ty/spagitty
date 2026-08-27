<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-015 — Plan

**Item:** [`agile/items/TASK-015-document-drift.md`](../items/TASK-015-document-drift.md)
**Branch:** `task/TASK-015-document-drift`
**Base:** `356142f`, approved with the plan.

## Approach

Read every claim against the code before rewriting it, then rewrite for what is
true now rather than for what changed.

The sweep that found these is worth writing down, because it is repeatable:

```sh
grep -rn "not built\|deferred\|placeholder\|talks to a network\|not yet" \
  README.md docs/*.md CONTRIBUTING.md
```

Fourteen hits, eight of them stale. The other six were true and stayed —
`docs/ci.md`'s "Not yet running", the conflicted stash apply, the `ScreenStub`
paragraph, and the offline degradation of the licence list.

### Rewrite, do not delete

Every stale passage has a true replacement, so none is removed. A deleted
paragraph leaves a reader wondering whether the thing was dropped or the
document was; a rewritten one says what happened. Amendment 11 asks for
correction or an explicit supersession, and correction is available here.

### Write the claim that will not drift again

The README used to list which screens existed, which guarantees a rewrite every
time one is added. It now says every screen in the handoff is built and points
at `docs/screens.md`, which is the document that has to be right anyway and is
checked by the record test.

### The network claim gets the most care

"Nothing in Spagitty talks to a network" is a privacy promise in the first
paragraph a person reads. Its replacement is deliberately more specific than the
sentence it replaces: which screen, through which layer, with whose token, and
what does *not* leave the machine. A narrower promise that is true is worth more
than a broad one that was.

### `forge/` gets the `shell.rs` treatment

`docs/architecture.md` already documents `shell.rs` as a boundary — one module
allowed to spawn a process, everything else forbidden. `forge/` is the same
shape for the network, and the crate enforces it the same way, so it is
documented the same way: a short section, a file table, and the sentence about
what the webview still cannot do.

## Files

- `README.md` — the Status section.
- `docs/screens.md` — the 1H row, the deferral paragraph, and passages in 1C,
  1E, 1F and 1H. **Not** 1D, which belongs to the Conflicts footer item.
- `docs/architecture.md` — the core module table, the duplicate `shell.rs` row,
  and a new `forge/` section.

## Testing

`tools/record.test.ts` is the only automated check that reads these documents,
and it checks identifiers rather than prose. It runs green.

Everything else is reading, and the sweep documents it as tickets: each ticket
takes one claim and points at the code that either supports it or does not.

## Risk

The risk in a documentation sweep is writing a new claim that is also wrong.
Every replacement here was checked against a named file or a named test, and the
sweep repeats those checks rather than re-reading the prose.

`docs/screens.md` is edited by both this item and the Conflicts footer item, in
different sections. Whichever merges second will need the other's section, which
is a conflict that shows up rather than a fact that goes missing.

## Rollback

Revert the commit. The documents go back to describing the application as it was
several features ago.
