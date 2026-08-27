<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-038 — Plan

**Item:** [`agile/items/FEAT-038-pull.md`](../items/FEAT-038-pull.md)
**Branch:** `feature/FEAT-038-pull`
**Status:** implemented, in `b71f8aa`.

*Backfilled by TASK-013 from the branch, the commit and the tests.*

## Approach

One `git pull`, three modes, and a click that cannot go wrong.

### One `git pull`, not fetch-then-merge

`shell::fetch` and `shell::merge` both existed and nothing joined them, so the
obvious build is fetch then merge. It is the wrong one: git resolves which
upstream the current branch tracks by reading `branch.<name>.remote` and
`branch.<name>.merge`, either of which can be set per branch, and that
resolution is exactly the part not worth reimplementing. `shell::pull` runs one
command with `--progress --no-edit` and a mode flag.

### Three modes, offered rather than assumed

| Mode | Flag | Reached by | Why there |
| --- | --- | --- | --- |
| `fastForwardOnly` | `--ff-only` | clicking **Pull** | Moves the branch forward or refuses and says so. It can never write a merge commit or leave a conflict, so it is safe to be the click. |
| `merge` | `--no-rebase` | right-click menu | Writes history; a deliberate choice. |
| `rebase` | `--rebase` | right-click menu, marked destructive | Rewrites local commits. |

A single click takes the operation with no bad outcome. The two that write
history are one gesture further away, which is the same shape the graph's own
destructive actions already use.

### Uncommitted work is handled, not reported

Pulling onto a dirty working copy fails with git's *"Your local changes would be
overwritten by merge"* — correct, and useless, because it names the problem and
leaves the person to work out that the answer is a stash. The confirmation now
says how many changes there are and offers to stash them, pull, and put them
back, using `api.stashPush` and `api.stashAction`, which FEAT-014 already
exercises.

**The ordering around a failed pull is the part that could lose work**, and it
is deliberate:

- the **stash** failing means nothing was touched, so nothing is pulled;
- the **pull** failing leaves the changes in the stash. Restoring them on top of
  a half-finished pull hands back a working copy in a state neither the user nor
  git put it in;
- the **restore** failing says so separately, because "pulled, and your changes
  are still stashed" has a different next step from "nothing happened".

### The toolbar, centred

`.actions` used `margin: 0 auto` inside a flex row whose first child grows,
which centres the actions in what is *left over* rather than in the bar — so
they sat right of centre by half the pickers' width. Three grid tracks with
equal outer two puts them in the middle of the window, which is where they look
aimed.

## Files

`crates/spagitty-core/src/shell.rs` — `pull`, and `PullMode`.
`crates/spagitty-core/src/ops.rs` — the op.
`src-tauri/src/commands.rs`, `src-tauri/src/lib.rs` — the command and its
registration.
`src/lib/api.ts`, `src/lib/types.ts` — the call and the mode type.
`src/lib/graph/actions.ts` — `pull`, the confirmations, and the stash dance.
`src/lib/chrome/Toolbar.svelte` — the button, its menu, and the grid.
`src/lib/graph/actions.test.ts` — the `pull` block.

`src/lib/graph/GraphHeader.svelte` and `columns.test.ts` also move in this
commit: BUG-009b's work was carried along on the same branch.

## Testing

The confirmations and the failure ordering are the whole risk, and they are
frontend logic, so the tests are in `actions.test.ts` against a stubbed `api` —
eleven of them, listed in `FEAT-038-automated.md`. `shell::pull` itself is three
lines of argument assembly over `run`, whose own behaviour is covered by the
existing shell tests.

## Risk

High for a toolbar button, which is why the click is `--ff-only`. The worst
outcome of the safe mode is a refusal with a message. The genuinely dangerous
path — stash, pull, restore — is where the tests are concentrated, and each of
its three failure points has one.

## Rollback

Revert the branch. Nothing persists; the only state a pull leaves behind is
git's own.
