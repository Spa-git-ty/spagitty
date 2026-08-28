<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-013 — Automated tests

**Item:** [`agile/items/FEAT-013-branch-destructive-operations.md`](../items/FEAT-013-branch-destructive-operations.md)
**Plan:** [`agile/plans/FEAT-013-plan.md`](../plans/FEAT-013-plan.md)

## What was written

| Test | Layer | What it asserts |
| --- | --- | --- |
| `an_unmerged_branch_is_refused_without_force` | `crates/spagitty-core/src/ops.rs` | git itself refuses, the error says "not fully merged", and the branch is still there. The guard the whole merged/unmerged distinction rests on. |
| `forcing_deletes_an_unmerged_branch` | `crates/spagitty-core/src/ops.rs` | `force` really does reach `-D`, so the confirmation is the only thing in the way. |
| `renaming_carries_the_branch_and_leaves_no_old_name` | `crates/spagitty-core/src/ops.rs` | The new name exists and the old one does not. |
| `says nothing is lost when the branch is merged` | `src/lib/branches/actions.test.ts` | The merged wording, which is the one that should not frighten anybody. |
| `names the commands that bring an unmerged branch back` | `src/lib/branches/actions.test.ts` | `git branch <name> <id>`, with the row's own short id in it. The item asked for the actual command and this is it. |
| `still names the way to find the id when it has none` | `src/lib/branches/actions.test.ts` | Without an id the sentence names `git reflog` first, because that is where the id comes from. |
| `refuses the branch that is checked out` / `refuses a remote-tracking ref` / `allows an ordinary local branch` | `src/lib/branches/actions.test.ts` | `undeletable()`, each answer exact — it is what decides whether the row gets a button or a label. |
| `asks nothing and calls nothing for a refused row` | `src/lib/branches/actions.test.ts` | A refused row does not even open a dialog. |
| `forces only when the branch is unmerged, and asks first` | `src/lib/branches/actions.test.ts` | The gate, asserted at the moment it matters: the dialog is open and the store has been called zero times. |
| `does not force a merged branch, and does not paint it as danger` | `src/lib/branches/actions.test.ts` | `-d`, not `-D`, and no red. |
| `does nothing when the question is dismissed` | `src/lib/branches/actions.test.ts` | Dismissal reaches nothing. Repeated for rename and for the bulk cleanup. |
| `asks for the name and says what comes with it` | `src/lib/branches/actions.test.ts` | A prompt pre-filled with the current name, whose body mentions the upstream. |
| `does nothing when the name comes back unchanged` | `src/lib/branches/actions.test.ts` | Accepting the prompt without editing is not a rename. |
| `will not rename a remote-tracking ref` | `src/lib/branches/actions.test.ts` | No dialog at all. |
| `is local, merged, and never the branch you are standing on` | `src/lib/branches/actions.test.ts` | The current branch is merged into itself, which is exactly the trap a bulk cleanup falls into. |
| `shows every name in the question rather than a count` | `src/lib/branches/actions.test.ts` | Both names are in the body. The design decision, pinned. |
| `never forces, so a branch that is no longer merged fails instead` | `src/lib/branches/actions.test.ts` | `deleteMany(names, false)`. The list is a moment old and forcing it through would turn a stale read into lost commits. |
| `asks nothing when there is nothing merged to clean up` | `src/lib/branches/actions.test.ts` | No dialog about nothing. |
| `deletes a branch, forcing only when told to` | `src/lib/branches/store.test.ts` | The flag reaches the API unchanged. |
| `re-reads the list and the repository afterwards` | `src/lib/branches/store.test.ts` | A deleted branch changes what every other row's merged flag means, so the walk is redone. |
| `surfaces a refusal rather than pretending it worked` | `src/lib/branches/store.test.ts` | git's own "not fully merged" reaches `writeError`. |
| `renames, trimming what was typed` | `src/lib/branches/store.test.ts` | Whitespace around a typed name does not become part of the ref. |
| `refuses a rename to nothing or to the same name` | `src/lib/branches/store.test.ts` | Neither reaches git. |
| `deletes several branches one at a time` | `src/lib/branches/store.test.ts` | Order preserved, one call each — `git branch -d` takes a lock. |
| `stops a bulk delete at the first refusal` | `src/lib/branches/store.test.ts` | Two calls, not three, and the error is reported. |
| `does nothing for an empty bulk delete` | `src/lib/branches/store.test.ts` | No call. |
| `offers delete and rename on a local branch that is not checked out` | `src/lib/branches/BranchTable.test.ts` | Both are buttons, and Delete's title says why it is safe. |
| `paints delete as destructive only when commits would be lost` | `src/lib/branches/BranchTable.test.ts` | `danger` on the unmerged row and not the merged one, with the titles to match. |
| `will not delete the branch you are standing on, and says why` | `src/lib/branches/BranchTable.test.ts` | A `SPAN`, not a button, carrying the reason. |
| `will not delete a remote-tracking ref from this screen` | `src/lib/branches/BranchTable.test.ts` | The same, for the other refusal. |
| `disables the actions while a write is in flight` | `src/lib/branches/BranchTable.test.ts` | Extended by this item without being rewritten: every button on the row, chips included, goes dead. It is what caught `Chip` having no `disabled`. |

## What is not covered

- **The screen's cleanup row.** `mergedBranches` is asserted directly and the
  row renders from it, but the route is not mounted — routes are read as text
  in this suite, not mounted. SWEEP-013-05 covers what it looks like.
- **A branch that stops being merged between the walk and the click.** The
  `false` passed to `deleteMany` is asserted; the race itself is not
  reproducible in the suite. SWEEP-013-06.
- **Upstream configuration surviving a rename.** `git branch -m` carries it and
  the dialog says so; asserting it needs a remote, which this suite does not
  have. SWEEP-013-04.
