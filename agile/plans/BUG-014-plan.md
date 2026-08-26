<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-014 — Plan

**Item:** [`agile/items/BUG-014-conflicts-footer-says-resolving-is-not-built.md`](../items/BUG-014-conflicts-footer-says-resolving-is-not-built.md)
**Branch:** `bugfix/BUG-014-conflicts-footer`
**Base:** `356142f`, approved with the plan.

## Approach

Take the footer off, and correct the document that says the same thing.

### Why removed rather than reworded

A footer has to earn its row. This one had two sentences and both were the
header's job:

| The footer said | The header already shows |
| --- | --- |
| the screen only reads | Continue and Abort, and a file count |
| `git <operation> --abort` gets you out | an Abort button, six rows above |

Rewording it means inventing something for it to say. TASK-008 faced the same
question on Branches and answered it the same way: the honest version of a
footer that repeats the header is no footer.

`escapeHatch` had no other reader and goes with it. So does `.foot`, which
otherwise becomes a style for an element that no longer exists — the same class
of drift one layer down.

### Why the doc change is in this item and not the drift sweep

`docs/screens.md`'s 1D section carries the identical false claim, from the
identical cause. Amendment 11 asks for the document to be corrected in the same
change as the code, and splitting one sentence across two items would leave one
of them true for a while and the other not.

The README's network claim and the Pull requests row are a different false
claim from a different item, and they stay out of this one.

### What is kept

"Reading never writes" is still true and still tested, so it stays — narrowed to
what the test proves rather than stated over the whole screen. The test is
`reading_every_side_never_writes_to_the_repository` in
`crates/spagitty-core/src/conflicts.rs`, which takes the index's modification
time either side of visiting every conflicted file and also fails on a lock left
behind.

## Files

- `src/routes/conflicts/+page.svelte` — the `<footer>`, the `escapeHatch`
  derived, the `.foot` style, and a note in the component's doc comment saying
  why there is no footer.
- `docs/screens.md` — the 1D section: the deferral line, the "nothing writes"
  paragraph, and the sentence about disabled buttons.

## Testing

No new automated test: nothing was added, and no existing test asserted on the
removed text — which is itself worth recording, because a test that had read
that sentence would have failed the day FEAT-016 landed and this would have been
found then. The sweep covers what a reader sees.

The full suite is run to prove the removal took nothing else with it.

## Risk

Very low. One element with no behaviour, one derived value with no other reader,
one style with no other user.

## Rollback

Restore the footer and the derived value. The screen goes back to telling users
that a feature it is running is not built.
