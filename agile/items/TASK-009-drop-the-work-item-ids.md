<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-009 — The interface stops naming its own work items

**Status:** Done on `task/TASK-009-network-copy`.
**Screens:** Pull requests, Settings → Accounts, Settings → Behaviour, Conflicts, Rebase.
**Found by:** the author, running the build. Not by any test.

## Problem

Two things, found together.

**1. The network narration TASK-007 was supposed to remove.** The 2026-08-18
intake named `src/routes/requests/+page.svelte:52` for removal *in TASK-007* —
but it said so in a paragraph under the FEAT-017 section rather than in
TASK-007's own removal table. TASK-007 was executed from the table, so the line
survived:

> "Nothing in this application talks to a network today. Connecting an account
> is FEAT-017."

The same screen's footer said the same thing again at greater length, and
Settings → Accounts said it a third time. Neither was in the intake at all.

**2. The interface quotes internal work item identifiers.** Removing the above
turned up the wider problem — eight places where a user is shown a string only
this project's own record can resolve:

| Where | What it said |
| --- | --- |
| `conflicts/+page.svelte` ×3 | "Marking a file resolved is FEAT-016" |
| `rebase/+page.svelte` | "Running a rebase is FEAT-015" |
| `settings/BehaviourSection.svelte` ×2 | "FEAT-019 — committing does not read this yet" |
| `requests/RequestDetail.svelte` ×2 | "Reviewing needs a connected account — FEAT-017" |

"FEAT-016" tells the person holding the mouse nothing. It is a key into
`agile/`, and `agile/` is not shipped.

## Scope

- Remove the three network-narration passages.
- Replace every user-visible work item identifier with what is actually
  missing — "Marking a file resolved is not built yet".

## Kept, deliberately

The privacy sentence in Settings → Accounts, rewritten to
*"Nothing here leaves this machine except through a service you connect
yourself."*

It is not the application narrating its limitations. It is a commitment about
what GitLumiere does with someone's repositories — exactly the sort of thing a
person cannot verify for themselves and would want to know **before** connecting
an account. TASK-007's rule keeps a sentence that carries information the user
cannot see on the screen, and this is the clearest case of one.

## Acceptance criteria

- No `FEAT-`, `BUG-` or `TASK-` identifier appears in any string the interface
  can render.
- Every control that cannot run still says why, in words.
- The privacy commitment survives.

## Dependencies

TASK-007, whose rule this applies and whose miss it corrects.
