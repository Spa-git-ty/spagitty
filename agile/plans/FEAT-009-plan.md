<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-009 — Plan

## Approach

One new core module, `crates/spagitty-core/src/rebase.rs`, and one screen. The
module answers two questions and writes nothing:

- **What would `git rebase -i <upstream>` open?** The todo list, in git's order.
- **What would history look like after this plan?** The preview, recomputed
  from the edits without running anything.

## Decisions

**The todo list is generated, not parsed.** Running `git rebase -i` to read the
file it opens would start a rebase — the thing this item exists to avoid. The
list is `upstream..HEAD` walked oldest first with merges excluded, which is what
`git rebase` itself lists. The test compares against
`git rev-list --reverse --no-merges <upstream>..HEAD`, so the claim is checked
rather than asserted.

**The plan is a list of edits over the todo, and the preview is a fold of it.**
No state machine, no undo stack: the edits *are* the state, and the preview is a
pure function of them. That makes the whole of criterion 2 unit-testable without
a repository, and it is why reordering can be driven from the keyboard as well
as by drag.

**Squash folds upward, which is what git does.** A squashed commit disappears
from the result and its changes join the row above it. A plan whose first row is
a squash has nothing above to fold into and is refused with a reason, the same
way `git rebase` refuses it.

**"May conflict" is a heuristic and says so in that word.** Two commits in the
plan touching the same path mark the later one. A real answer needs the merges
performed, which is execution, which is FEAT-015. Claiming a clean result we
cannot prove would be the worse lie; saying "may" is the honest shape of what
is known.

**Dropping everything is a preview, not an error.** An empty result is a
legitimate thing to plan and to look at before deciding against it. It carries a
warning rather than a failure.

**Nothing runs.** `shell::rebase_interactive` stays `unimplemented!()`, and
there is no command that could reach it. Apply renders disabled with FEAT-015
named. A test asserts the repository is unchanged after any amount of editing:
no rebase in progress and `ORIG_HEAD` where it was.

**Reordering works from the keyboard, not only by drag.** Drag alone is
untestable headlessly under Amendment 4 and unusable for some people. The store
owns the ordering; the component only reports intent.

## Files

- `crates/spagitty-core/src/rebase.rs` — new; `lib.rs`
- `src-tauri/src/commands.rs`, `lib.rs`
- `src/lib/types.ts`, `src/lib/api.ts`
- `src/lib/rebase/{store.svelte.ts,TodoList.svelte,PreviewPane.svelte}`
- `src/routes/rebase/+page.svelte` — replaces the `ScreenStub`

## Risks

- **The conflict heuristic will be wrong in both directions.** It will warn
  about commits that would merge cleanly and stay silent about ones that would
  not. The word "may" and a footer stating what the check actually is are the
  mitigation; a stronger claim needs FEAT-015.
- **A long range makes a long list.** The todo is capped and the cap is stated
  rather than silently applied, because a rebase of a thousand commits is a
  different operation from the one this screen is for.

## Rollback

Revert the commit. The screen returns to its stub. No repository was touched,
because nothing in this change touches one.
