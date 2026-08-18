<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-038 — Pull

**Status:** done on `feature/FEAT-038-pull`.
**Screen:** the toolbar, so every screen.
**Reported by:** the author, running the build.

## Problem

**There is no Pull.** The toolbar offers Fetch, Push, Clone, Branch, Stash and
Rebase. Pull — the operation most people perform more often than any other — was
never built: no button, no action, no `api`, no command, and no `shell`
function. `shell::fetch` and `shell::merge` both exist; nothing joined them.

Two smaller things, found with it:

- Pulling onto a dirty working copy fails with git's own message, *"Your local
  changes would be overwritten by merge"*. Correct and useless: it names the
  problem and leaves the user to work out that the answer is a stash.
- The toolbar actions are not centred. `.actions` used `margin: 0 auto` inside a
  flex row whose first child grows, which centres them in what is *left over*
  rather than in the bar — so they sat right of centre by half the pickers'
  width.

## Scope

**`shell::pull(repo, remote, mode)`** — one `git pull`, not fetch-then-merge.
Git resolves which upstream the current branch tracks, reading
`branch.<name>.remote` and `branch.<name>.merge`, either of which may be set per
branch. That resolution is exactly the part not worth reimplementing.

**Three modes**, offered rather than assumed:

| Mode | What it does | How it is reached |
| --- | --- | --- |
| `fastForwardOnly` | Moves the branch forward, or refuses and says so. Cannot write a commit or leave a conflict. | **Clicking Pull** |
| `merge` | Fast-forwards where it can, merges where it cannot. | Right-click → menu |
| `rebase` | Replays local commits on top. Rewrites them. | Right-click → menu, marked destructive |

A single click takes the one that cannot go wrong. The two that write history
are a deliberate choice.

**Uncommitted work is handled rather than reported.** With a dirty working copy
the confirmation names how many changes there are and offers to stash them,
pull, and put them back.

The ordering around a *failed* pull is the part that could lose work:

- the stash failing means nothing was touched, so nothing is pulled;
- the **pull** failing leaves the changes in the stash, deliberately — restoring
  them on top of a half-finished pull would hand back a working copy in a state
  neither the user nor git put it in;
- the **restore** failing is a different situation and says so, because "pulled
  but your changes are still stashed" has a different next step from "nothing
  happened".

**The toolbar is centred** with three grid tracks whose outer two are equal.

## Non-scope

- Pull on a specific remote or branch. The button pulls the current branch's own
  upstream, which is what `git pull` with no arguments means.
- A progress stream. Pull is synchronous like fetch and push; if that becomes a
  problem it is the same problem FEAT-015 solves for rebase, and belongs there.

## Acceptance criteria

- A Pull button exists and pulls.
- Clicking it never writes a merge commit.
- Right-clicking offers merge and rebase, with rebase marked destructive.
- With uncommitted changes it offers to stash, and never restores them on top of
  a failed pull.
- The toolbar actions are centred in the window.

## Dependencies

None. Uses `api.stashPush` and `api.stashAction`, both of which FEAT-014 already
exercises.
