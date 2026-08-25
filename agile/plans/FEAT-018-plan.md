<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-018 — Plan

**Item:** [`agile/items/FEAT-018-fetch-and-push.md`](../items/FEAT-018-fetch-and-push.md)
**Branch:** `feature/FEAT-018-finish-fetch-push`
**Status:** implemented.

**Branch point.** Cut from `feature/FEAT-051-tags`, continuing the unmerged
stack.

## What was owed

The item's own **What actually shipped** section, written by TASK-013 from the
code, listed five things still owed. One of them — setting an upstream on first
push — was fixed in FEAT-049, because the divergence bar had nothing to read
without it. The other four are this plan.

## Approach

### Pruning stops being silent

`shell::fetch` passed `--prune` on every call. Pruning deletes remote-tracking
refs; a branch quietly vanishing from the graph because somebody pressed Fetch
is exactly the destructive-without-being-chosen case Amendment 6 exists for, and
the item's own notes said so.

It is a parameter now, and a **setting** — `pruneOnFetch`, off by default,
beside the other two that change what the application does. Off because a
branch disappearing is a surprise and a preference nobody set should not spring
one.

It is read in **one place**, `network.fetch`, rather than passed by each caller.
A button that supplied its own value could prune when the setting said not to,
and there is no reason for two answers to exist.

The command log benefits too: `git fetch --progress --prune --all` and
`git fetch --progress origin` are now different lines, so the log can tell a
fetch that deleted refs from one that did not. It could not before.

### Progress, on a worker

`--progress` was being passed and nothing read it, so git's output arrived all
at once when the process ended. On a large fetch that is a minute of silence
followed by everything, which is indistinguishable from an application that has
hung.

`network_worker.rs` spawns fetch or push and streams stderr, the same way the
clone worker does — and it reuses `clone::progress` to parse it, because
`git fetch --progress` and `git push --progress` write the same
`phase: 42% (…)` lines a clone does. Three operations, one parser.

It is deliberately **not** the clone worker. A clone is cancellable and owns a
destination directory it may have to remove. Fetch and push change a repository
that is already open and neither is cancelled: killing a push mid-transfer has
no defined outcome, and an interrupted fetch simply keeps the refs it had
already written.

The second reason for a worker is the one the rebase worker already gave: a
blocking command holds the session lock, so nothing else can ask the repository
anything while a slow network operation runs.

**The worker is released by the screen**, on the done event. It cannot let go of
itself — dropping it joins its own thread — and a leak would refuse every later
fetch with "already running".

### Per-remote fetch

Every layer has taken a remote since the plumbing was built. The button always
sent the empty string, so "fetch one remote" existed everywhere except where
anybody could ask for it. Right-clicking Fetch now offers each remote by name,
alongside "every remote".

The remote list is read when the menu opens rather than kept live. Remotes
change about once a year, and a store loaded on every repository change to fill
a menu nobody opened is work done for nothing.

### The Branches screen says how old its numbers are

Ahead and behind are counted against remote-tracking refs, which only move when
something fetches. A divergence bar on a repository nobody has fetched for a
week is a week out of date and looks exactly as confident as one from a minute
ago.

The header now says `drift as of 20 minutes ago`, or `drift never fetched`, and
only when a branch actually tracks something — with no upstreams there is
nothing on the screen a fetch would change. A Fetch button sits beside Refresh,
because the answer to a stale number is not to re-read the same refs.

## What was not done

- **Cancelling a fetch or push.** See above: neither has a defined outcome when
  killed part-way.
- **Force push through the interface.** The parameter exists in every layer and
  nothing offers it, which the item says is deliberate and this plan does not
  change.
- **Pull on the worker.** `pull` is still blocking. It is fetch-and-integrate in
  one command, and the integrate half can stop in a conflict — which is a
  different shape of outcome from what this worker reports, and worth its own
  pass rather than a hasty one.
