<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-008 — The last self-narrating footer

**Status:** Done on `task/TASK-008-branches-footer`.
**Screen:** Branches (1F).
**Raised by:** TASK-007, which found it inside the sweep's spirit but outside
its exhaustive removal list, and reported it rather than absorbing it
(Amendment 3).

## Problem

`src/routes/branches/+page.svelte` ends in a footer reading
*"Nothing here deletes a branch."*

TASK-007 removed six sentences of exactly this genre. This one was not on the
intake's list, so it stayed — and stands out now that its six siblings are gone.

## Why it goes, even though it is true

Unlike the six TASK-007 removed, this sentence is accurate: the Delete chip in
`BranchTable.svelte:87` is inert, pending FEAT-013.

It goes on both halves of TASK-007's rule anyway.

1. **It announces that the application does nothing.** That is the rule's second
   clause, and truth is not the test — the six removed sentences were all true
   too.
2. **It is in the wrong place.** The chip already carries its reason in its own
   `title` (`"Deleting branches is not built yet"`), at the control it is about,
   where someone wondering about it will actually look. A strip along the bottom
   of the screen is where you put a sentence you want read by nobody.

## Scope

- Remove the sentence.
- The footer is then error-only, so it becomes conditional on there being an
  error — the shape Stash and Settings took in TASK-007. Left unconditional it
  would be a bordered empty strip on every ordinary visit.

## Non-scope

- Wiring the Delete chip. That is FEAT-013 and carries a real design question
  about unmerged branches and the reflog.

## Acceptance criteria

- The sentence appears nowhere in the interface.
- No footer renders on the Branches screen when there is no error.
- A write failure still surfaces in a footer.
- The Delete chip still explains itself on hover.

## Dependencies

TASK-007, which established the rule and the conditional-footer shape.
