<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-078 — Who asked for this task

**Status:** Done
**Branch:** `feature/FEAT-078-who-asked-for-this`
**Screens:** Farm (1Q).
**Raised by:** the author — *"I want to distinguish between tasks I created
myself and tasks agents created."*

## Problem

A farm mixes work a person decided on with work a model produced, and after
twenty tasks the two are indistinguishable. Three of the four ways a task can
come into existence are an agent's:

- a person types one in the editor;
- a planning run cuts the goal into some;
- a decomposition cuts one task into more (FEAT-076);
- an agent proposes one in its handoff while doing something else, and **nobody
  asked for it at all**.

All four rendered as the same grey row. That matters because they are not owed
the same trust: a task the author wrote is a decision, and a task an agent
proposed is a suggestion that happened to be convenient.

## Change

`Task.origin` records who asked, as a tagged enum rather than a flag, so it can
carry *which* agent and *what it came out of*:

| Origin | Row | Panel |
| --- | --- | --- |
| `Person` | unmarked | You added this. |
| `Planned { agent }` | `⌁` | claude cut this out of the goal. |
| `Subtask { agent, parent }` | `⌁` | codex cut this out of TASK-0002. |
| `Proposed { agent, from }` | `⌁` | claude proposed this while working on TASK-0003. Nobody asked for it. |

A person's own work is **unmarked**, deliberately: most rows in most farms are
theirs, and a mark on everything marks nothing. The mark is one quiet glyph with
the sentence on its tooltip; the sentence itself is in the task panel, under
*Asked for by*.

It is written on the task rather than derived from the event log, because the
log is bounded at two thousand events and a task outlives it.

## Scope

- `TaskOrigin`, set at all four creation points.
- The mark on the row, the line in the panel, the wording in `describe.ts`.

## Non-scope

- **Filtering the list by origin.** Worth having once a farm is big enough to
  need it; the drawer's filter is the pattern to follow, and it is not this
  item.
- **Trust rules that depend on origin** — refusing to auto-merge a proposed
  task, say. That is a product decision about autonomy, and inventing it here
  would smuggle a policy in behind a label.
- Attribution of *commits*. The delight layer already reads `Co-authored-by`
  trailers for that (FEAT-072).

## Acceptance criteria

- A task typed in the editor reads as the person's own, and carries no mark.
- A planned task names the agent that planned it.
- A subtask names the agent and the task it was cut out of.
- A proposal says plainly that nobody asked for it.
- A farm saved before this change reads as the person's own work rather than as
  an unknown.
