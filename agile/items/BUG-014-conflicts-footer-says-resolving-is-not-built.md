<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-014 — The Conflicts screen says resolving is not built

**Status:** Fixed on `bugfix/BUG-014-conflicts-footer`.
**Screens:** Conflicts (1D).
**Found by:** a sweep of the tree against the record.

## Reproduction

1. Put a repository into a conflicted state — a merge or a rebase that stops.
2. Open the Conflicts screen.
3. Read the footer.

## Observed

```
This screen only reads; resolving is not built yet.
Today, git rebase --abort is what undoes the operation.
```

The footer is unconditional, so it says this on every visit, underneath a screen
that is at that moment resolving files.

`docs/screens.md` said the same thing in three places: "Resolution writes are
deferred to FEAT-016", "Nothing on this screen writes — not the module, not the
commands, not the markup", and "Mark resolved and Abort render disabled with
FEAT-016 named on each".

## Expected

Nothing that says resolving is unbuilt, because FEAT-016 built it: three ways
out of a file, and Continue and Abort in the header.

## Cause

FEAT-016 added the writes and the buttons and left the footer behind. The
sentence was true when it was written, which is exactly why it survived — a line
that was correct once does not look wrong on a later read.

The escape-hatch half was stale twice over. `git <operation> --abort` was the
answer when there was no way to abort from the screen; there is a button that
runs it, sitting in the header, six rows above the sentence telling the user to
type it.

## Fix

The footer is removed rather than reworded. Everything it could truthfully have
said, the header already says: the operation in progress, the file count,
Continue, and Abort with its confirmation. A footer that repeats the header is
what TASK-008 took off the Branches screen, and the reasoning has not changed.

`escapeHatch` goes with it — it had no other reader — and so does the `.foot`
style. The screen's own doc comment records why there is no footer, so the next
person to notice the empty space does not put one back.

`docs/screens.md`'s 1D section is corrected in the same change, as Amendment 11
requires. The read-only claim is kept where it is still true and narrowed to
what the test actually proves: *reading* never writes, and `conflicts.rs` holds
that by taking the index's modification time either side of visiting every file.

## Acceptance criteria

- Nothing in the interface says resolving is unbuilt.
- Nothing tells the user to type a command that a button already runs.
- `docs/screens.md` describes a screen that writes.
- The claim that reading does not write survives, because it is still true and
  still tested.

## Non-scope

The rest of the document drift found in the same sweep — the README's network
claim, and the Pull requests row still marked offline. Those are one item of
their own, not riders on this one.

## Dependencies

FEAT-016, which built the writes and left the sentence. TASK-008, which is the
precedent for taking a footer off rather than rewording it.
