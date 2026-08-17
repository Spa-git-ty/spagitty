<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-028 — Plan

## Decisions

**One owner for an operation.** Fetch and Push call the same `fetchAll()` and
`pushCurrent()` the palette calls, rather than re-implementing an invoke here.
Two call sites for one operation is how two behaviours appear — one reporting
through `notice`, one not.

**Groups as data.** The actions become an array of arrays, so the dividers are a
consequence of the structure rather than markup sprinkled between buttons. Adding
an action to a group is a one-line change and cannot leave a divider stranded.

**Commit leaves rather than being fixed in place.** It could have been made to
actually commit from here, and it should not be: committing needs a message, and
a message box in a 50px chrome row is a worse Working copy screen than the one
that exists.

## Files

| File | Change |
| --- | --- |
| `src/lib/chrome/Toolbar.svelte` | Groups, centring, wired Fetch/Push, Commit removed. |
| `src/lib/chrome/chrome.test.ts` | Updated to the new contract. |

The test that covered the old Commit button moved to
`~/claudetrashbin/gitlumiere-FEAT-028/` rather than being deleted.

## Risk

The centred row is `margin: 0 auto` between two flex items; on a narrow window
it stops being centred and simply flows, which is the right degradation. Worth a
sweep ticket at a small window size.

## Rollback

Revert. The Commit button and the two misleading tooltips come back.
