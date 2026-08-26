<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-015 — The documents describe a Spagitty that no longer exists

**Status:** Done on `task/TASK-015-document-drift`.
**Raised by:** the author: "rewrite drifts or remove them if not needed".

## Problem

Eight passages across three documents describe work that has since been built.
Each was true when it was written, which is why every one of them survived: a
sentence that was correct once does not look wrong on a later read.

| Where | Said | Closed by |
| --- | --- | --- |
| `README.md` | "the remaining screens are placeholders being built one at a time" | every screen is built |
| `README.md` | "Nothing in Spagitty talks to a network" | FEAT-017 |
| `docs/screens.md` table | 1H "Built (offline)" | FEAT-017 |
| `docs/screens.md` | "the host the Pull requests screen cannot connect to, the accounts Settings has no client for" | FEAT-017 |
| `docs/screens.md` 1C | "Nothing here can discard work… Discarding… is not built" | FEAT-048 |
| `docs/screens.md` 1E | "Execution is deferred to FEAT-015" | FEAT-015 |
| `docs/screens.md` 1F | "Delete and rename are deferred to FEAT-013" | FEAT-013 |
| `docs/screens.md` 1F | "The footer says so" | TASK-008 took that footer off; FEAT-018 moved the fact to the header |

`docs/architecture.md` had drifted differently — not by saying something false,
but by having stopped keeping up. Its module table listed sixteen modules of the
twenty-five that exist, missing every one added since FEAT-017: `forge/`,
`signing.rs`, `remotes.rs`, `reflog.rs`, `tags.rs`, `record.rs`, `update.rs` and
`fixture.rs`. It also listed `shell.rs` twice, with two different descriptions.

The most serious of these is the network claim. It appears in the README, which
is the first thing anybody reads, and it is the kind of promise a person might
choose this application *for*. Leaving it there is worse than an out-of-date
feature list: it is a privacy claim that stopped being unconditionally true.

## Change

Every passage rewritten to what is true now, none deleted — each had a true
replacement, and Amendment 11 asks for correction over removal.

- The README's status says every screen is built and points at
  `docs/screens.md` as the authority, rather than listing screens that will
  drift again.
- The network claim becomes the accurate, narrower one: one screen reaches a
  network, through the Rust core, with a token the user issued; the webview
  links no client and holds no token; nothing else leaves the machine. That is
  a promise that can still be kept.
- `docs/architecture.md` gains the nine missing modules, loses the duplicate
  row, and gains a short section for `forge/` as a boundary — the same treatment
  `shell.rs` already had, because it is the same kind of thing: a narrow seam
  that everything else is forbidden to cross.

## Non-scope

The 1D section's identical claim about conflict resolution. It is the same
false sentence, from the same cause, as the footer on the Conflicts screen
itself, and it is corrected by the bug item that removes that footer — splitting
one sentence across two items would leave half of it standing.

`docs/ci.md`'s "Not yet running" is **not** drift. The gates still have not run.

## Acceptance criteria

- No document claims a built screen is unbuilt.
- The README's network claim matches what the code does.
- `docs/architecture.md` lists every module in the core crate, once each.
- Nothing is deleted that had a true replacement.

## Dependencies

FEAT-017, FEAT-048, FEAT-015, FEAT-013, FEAT-018 and TASK-008 — the items whose
work these documents had not caught up with.
