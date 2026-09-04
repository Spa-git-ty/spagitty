<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-022 — The farm subscribes after it asks, so the answer is lost

**Status:** Fixed, awaiting sweep
**Branch:** `feature/FEAT-076-large-work` (see *Where this lives*)
**Screens:** Farm (1Q).

## Problem

Open the Farm screen on a repository with Claude Code, Codex and Oh My Pi
installed and the screen says **Agents 0**. The agents pane lists all three by
their correct absolute paths and marks each **Not installed**. **Plan it** is
disabled, nothing can be routed, and the farm cannot do anything at all — which
is what "the farm freezes / subtasks just pend" looks like from the outside.

Nothing is wrong with detection. Measured in the running application, the probe
finds all three and reports them `Available` with their versions, and the event
carrying that result is emitted successfully.

**The webview is not listening yet when it arrives.**

```ts
apply(await api.open(path));   // farm_open: starts detection on a thread
await this.listen();           // …and only now do we subscribe
```

`farm_open` does not only answer. It creates the service and starts agent
detection on a thread of its own — deliberately, because probing four agent
CLIs takes long enough to be visible and opening a repository must not wait for
it. The result comes back as an event a few hundred milliseconds later.
Subscribing *after* the command returns leaves a window with nobody listening,
and the event that lands in it is the one that decides whether the farm has any
agents.

Nothing recovers it. The next snapshot would carry the detected agents, but a
snapshot is only taken after an event or an action, and no event ever arrives.
So the farm sits there claiming that installed agents are not installed until
something unrelated causes a refresh.

## Reproduction

1. Have at least one agent CLI on `PATH`.
2. Start Spagitty and open a repository.
3. Go to the Farm screen and look at the header.

**Observed:** `Agents 0`, Plan it disabled, every agent "Not installed".
**Expected:** the agents that are installed, within a second, without touching
anything.

**Environment:** any. It is an ordering fault in the front end.

## Scope

- The store subscribes before it asks, so nothing emitted in answer can be lost.
- A test fails without the fix.

## Non-scope

- The version string an agent reports. On this machine it reads
  `mise ~/.config/mise/config.toml tools: claude@2.1.259`, which is a version
  manager's banner rather than the agent's version. Cosmetic, and its own item.

## Where this lives

On `feature/FEAT-076-large-work` rather than a branch of its own, in its own
commit. The fix is four lines inside `farmStore.open`, which FEAT-076's branch
also rewrites; separating them would produce a guaranteed conflict in one
function and give a reviewer nothing. Amendment 13 asks for a branch per work
item and this is a deliberate, reported departure from it — say the word and it
becomes `bugfix/BUG-022-subscribe-before-asking`, cut from `dev`.

## Acceptance criteria

- A cold start, first visit to the Farm screen, shows the agents that are
  installed and enables Plan it — with no reload and no other action.
- A test asserts the subscription exists at the moment the backend is asked.
