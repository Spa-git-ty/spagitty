<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-009 — Plan

**Item:** [`agile/items/TASK-009-drop-the-work-item-ids.md`](../items/TASK-009-drop-the-work-item-ids.md)
**Branch:** `task/TASK-009-network-copy`
**Status:** implemented.

## Approach

TASK-007's rule, applied to what it missed, and then to what the miss revealed.

**The miss is worth recording, because the cause is procedural rather than
technical.** The intake carried an exhaustive removal *table* for TASK-007 and,
separately, a sentence in prose under the FEAT-017 section naming a seventh
removal "in TASK-007". TASK-007 was executed against the table. Working from a
structured list is right; the lesson is that the list has to be assembled from
the whole document rather than from the part that looks like the list.

Removing those passages surfaced the wider defect. Once the network narration
was gone, what remained were eight controls explaining themselves by quoting an
identifier — `FEAT-016`, `FEAT-015`, `FEAT-019`, `FEAT-017`. That is worse than
the copy TASK-007 removed: a footer explaining what a button does is merely
redundant, while "Marking a file resolved is FEAT-016" is a key into a record
that is not shipped. Each now says what is actually missing.

### What was kept, and why it is not the same thing

The privacy sentence in Settings → Accounts stays, rewritten to
*"Nothing here leaves this machine except through a service you connect
yourself."*

TASK-007's rule keeps a sentence carrying information the user cannot see on the
screen. A commitment about what the application does with someone's
repositories is the clearest possible case: it cannot be verified by looking,
and it is exactly what a person would want to know before connecting an account.
What went was the *justification* around it — that no HTTP client is linked into
either language — which is an implementation detail defending a promise the
promise can make on its own.

## Files

| File | Change |
| --- | --- |
| `src/routes/requests/+page.svelte` | the FEAT-017 line, the whole footer, and its now-dead `.foot` rule |
| `src/lib/settings/AccountsSection.svelte` | narration removed, privacy promise rewritten |
| `src/routes/conflicts/+page.svelte` | three identifiers |
| `src/routes/rebase/+page.svelte` | one |
| `src/lib/settings/BehaviourSection.svelte` | two |
| `src/lib/requests/RequestDetail.svelte` | two |
| three test files | assertions that pinned the identifiers |

## Testing

Three existing tests asserted the identifiers were present — they were written
when showing them was the intended behaviour. Each is rewritten to assert what
the control now says **and** that no identifier appears, with
`not.toMatch(/FEAT-\d/)`. Asserting only the new wording would let an identifier
creep back beside it.

## Risk

Low. Text only; no logic changed. The one judgement is the kept privacy
sentence, and it is argued above rather than left implicit.

## Rollback

Revert the branch.
