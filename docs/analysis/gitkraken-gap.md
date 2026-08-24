<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# Gap analysis: Spagitty against GitKraken

What a person who lives in GitKraken would find missing on their first week in
Spagitty. Written from the code, the screen inventory in
[screens.md](../screens.md), and the work items in `agile/items/` — every gap
below is either a named backlog item or named as deliberate.

## Where Spagitty stands

All twelve screens from the design handoff are built. The graph, diff, working
copy, branches, stash, log search and clone flows are real. Fetch, push, pull,
reset, revert, cherry-pick, merge and rebase-onto are wired through the graph's
right-click menus. What separates Spagitty from GitKraken falls into five
groups: half-finished core flows, the forge, safety nets, repository features,
and ecosystem.

## 1. Core flows that stop halfway

These are the gaps that hurt first, because the UI invites the action and then
refuses it.

| Gap | State today | GitKraken behaviour | Item |
| --- | --- | --- | --- |
| Conflict resolution writes | Ours/theirs/base shown read-only; take-ours, take-theirs, edit, mark-resolved and abort all render disabled | Full inline merge editor, per-file and per-hunk resolution, abort with one click | FEAT-016 |
| Rebase execution | Todo list and preview built; `rebase_run` exists but Apply is hardcoded disabled; no progress or abort path | Interactive rebase runs in-app with progress, conflict hand-off and abort/drop | FEAT-015 (partial) |
| Branch delete / rename | `ops::delete_branch` and `ops::rename_branch` exist in the core; frontend unwired | One click from the branch label or Branches screen, with merged-branch guardrails | FEAT-013 (partial) |
| Discard changes | Nothing on Working copy can discard — stage/unstage/commit only move forward | Discard file, discard hunk, discard all, with confirmation | none (named as deliberate in screens.md) |

Discard deserves its own item. A Git client that cannot throw away a mistake
pushes the user to the terminal for one of the most common daily operations,
and it is the cheapest of the four to build.

## 2. The forge

Spagitty links no HTTP client in either language — there is a test keeping it
that way. GitKraken's integration surface is its largest differentiator:

- **Accounts for GitHub, GitLab, Bitbucket and Azure DevOps**, with OAuth and
  token storage. Spagitty has Settings → Accounts as an empty section and a
  Pull requests screen whose empty state *is* the screen (FEAT-017).
- **PR lifecycle**: create a PR from a pushed branch, view diffs and comments,
  merge, check CI status on the graph. Spagitty cannot see a PR.
- **Issues** tied to branches and commits.
- **Clone from your host**: GitKraken lists your remotes' repositories in the
  clone dialog. Spagitty's clone takes an address you already know.
- **Authentication UX**: GitKraken ships its own SSH key generation and agent.
  Spagitty delegates entirely to credential helpers via the `git` binary and
  never asks for a password itself — principled, but a user without a helper
  configured has no path at all.

FEAT-017 covers the account/PR core. Issues, CI status and clone-from-host have
no item yet.

## 3. Safety nets

- **Commit signing**: the "Sign my commits" toggle persists and nothing reads
  it (FEAT-019). GitKraken handles GPG and SSH signing with passphrase prompts.
- **Undo beyond reflog**: the toolbar has Undo/Redo; GitKraken additionally
  surfaces an undo timeline for destructive operations. Worth verifying the
  coverage matches after rebase execution lands.
- **Conflicted stash apply**: surfaces git's stderr rather than the designed
  recovery flow — parked with FEAT-016.
- **Reflog view**: absent entirely. After any history rewrite goes wrong, the
  reflog is where recovery starts, and GitKraken shows it.

## 4. Repository features

Present in GitKraken, absent or invisible here:

- **Submodules UI** — recursion shells out to `git`, but there is no screen,
  no init/update, no per-submodule status. The rail footer counts them and
  nothing else does anything with them.
- **Git LFS** — the boundary names LFS as a `git`-binary concern; there is no
  LFS awareness anywhere in the UI (tracked patterns, oversized files, auth).
- **Worktrees** — no detection, no add/remove. Increasingly common workflow;
  GitKraken supports it.
- **Tags management** — create/delete exist via the graph's context menu only;
  there is no tags list, no annotated-tag message editing, no checkout-from-tag
  affordance gathered in one place.
- **Remotes management** — fetch/push/pull against existing remotes work, but
  adding, renaming or removing a remote requires the terminal. So does setting
  upstream on first push (verify: push uses `-u`? if not, first push leaves the
  branch unmapped).
- **Stash entry browsing** — detail panel shows the diff; per-file browsing is
  FEAT-034, backlog.
- **File history and blame as first-class views** — blame exists behind Log
  search's path filter; there is no dedicated file-history view with per-hunk
  blame gutter like GitKraken's file view.
- **Search by diff content** — Log search matches author, path, message and
  date. GitKraken also searches inside changes (`-G`-style); a common way to
  find where a function was renamed.

## 5. Diff and merge power

- **Image and binary diffs** — the diff pipeline is text hunks. GitKraken
  renders image before/after and says "binary" cleanly.
- **Inline editing in the merge/conflict pane** — blocked on FEAT-016.
- **External diff/merge tool configuration** — not surfaced in Settings.
  Users who live in a configured tool will ask immediately.
- **Syntax highlighting in diffs** — plain text today; GitKraken highlights.

## 6. Multi-repo and identity

- **Repository tabs** — done (FEAT-027); the session remains one repository at
  a time beneath the tabs, which matches the architecture. No gap.
- **Profiles** — GitKraken profiles switch `user.name`/`user.email`, SSH keys
  and settings as a set (work vs personal). Spagitty edits identity per scope
  carefully but has no switching concept.
- **Workspace/cloud sync** — GitKraken syncs open repos across machines.
  Deliberately out of character for this project; note it and move on.

## 7. Ecosystem

Lower priority, listed for completeness: auto-update channel, CLI companion
(`gk`), editor extensions (VS Code), GitKraken Cloud integrations (Jira, Slack),
and telemetry. None fit the project's stated offline-first, no-network posture
except auto-update, which has no item.

## Things Spagitty deliberately will not do

Recorded in `docs/reference/gitkraken-commit-graph.md` so they do not resurface
as gaps: dragging commits onto branches, inline commit-message editing on the
graph, manual lane layout, independent graph zoom. These are product decisions,
not missing work.

## Suggested order

1. **FEAT-013 finish + discard changes** — small, unblocks daily use of the
   Branches screen and Working copy.
2. **FEAT-015 finish** — rebase execution with progress and conflict hand-off;
   pairs naturally with FEAT-016 next.
3. **FEAT-016** — conflict resolution writes; the single biggest functional gap
   in the merge story.
4. **Remotes management UI + reflog view** — cheap screens that close real
   holes.
5. **FEAT-017** — forge integration; the largest remaining distance from
   GitKraken and the only one that needs a subsystem decision first.
6. Signing, submodules, LFS, worktrees, image diffs — in whatever order users
   actually ask.
