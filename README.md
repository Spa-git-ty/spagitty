# Spagitty

![Spagitty hero](assets/brand/hero.png)

**Untangle the work — yours, and your agents'.**

Spagitty is a local-first desktop Git client for repositories where people and
coding agents commit side by side. It shows the history as a graph you can
read, the working copy as a set of decisions you can make, and — because a
branch you did not write is still a branch you have to review — it keeps track
of who actually did what.

The name is *spa-gi-ty*: a repository without history, remotes and review
trails is a plate of tangled pasta, and a version control system's job is to
straighten it. The [brand guide](docs/branding.md) covers the mark, the
wordmark and the palette.

## What it is

A desktop application, not a web service. Repositories stay on disk, the
workspace is a plain directory, and nothing leaves the machine unless you ask
it to — a forge token you supply, a fetch you trigger, a pull request you open.
Spagitty is built on Tauri: a Rust backend that speaks to Git through `gix` and
the `git` binary, and a Svelte frontend that never talks to a repository
directly.

## For people working in Git

- **Commit graph.** Branch, tag and lane rendering, with the walk rooted at the
  branches you choose — hide, solo, or let it work out which branches relate to
  the one you are on.
- **Working copy.** Stage and unstage by file, hunk or line; discard with a
  clear account of what is being discarded.
- **Diffs.** Syntax highlighting across a dozen grammars, image comparison
  (side by side, swipe, onion skin), binary metadata, and search inside the
  patch text rather than only the commit message.
- **Branches, tags, stashes, worktrees, submodules and reflog**, each as a
  screen rather than a dialog.
- **Rebase and conflicts.** Interactive rebase planning, and a conflicts screen
  that resolves and writes — with an external merge tool if you prefer one.
- **Pull requests.** GitHub, GitLab and Bitbucket Cloud. Read them, review
  them, create them, and merge, close or reopen them without leaving the app.
- **Identity.** Named profiles for name, email and signing key, switched from
  the status strip, so a work commit is not signed with a personal key by
  accident.

## For repositories with agents in them

Agents commit fast, in volume, and often overnight. Spagitty is built for the
review that follows.

- **Attribution.** Commits are credited to the actor that made them, read from
  the `Co-authored-by` trailers agents already write. A human and the agents
  working beside them are tracked separately.
- **Standings.** Agents are ranked by first-pass rate — how often their work
  landed without needing a fix — never by how many commits they produced.
  Volume is the thing an agent is worst at being judged on.
- **Worktrees.** Several agents on several branches in one checkout, each in
  its own working tree, switched from the tab strip.
- **A review surface that assumes you did not write it.** File history and
  blame, diff search, and a pull request workspace built for reading a change
  cold.
- **The delight layer.** Badges and titles awarded for clean commits, survived
  rebases, recovered work and conflicts resolved — and never for time spent in
  the application. Agents earn them on the same rules a person does, which is
  what makes the standings mean anything. Its volume is a setting with a
  genuinely quiet end.

## Getting started

```sh
bun install
bun run check      # typecheck
bun run test       # vitest
bun run coverage   # vitest with the Amendment 10 floor
bun run tauri dev  # the desktop app
```

Rust and the WebKitGTK build dependencies are needed for the desktop build; see
[docs/ci.md](docs/ci.md), which is also the full automation contract — the six
gates, the coverage floor and the release lanes.

## Documentation

| | |
| --- | --- |
| [Architecture](docs/architecture.md) | The three layers, and the rule that only `src/lib/api.ts` calls the backend |
| [Screens](docs/screens.md) | Every screen, by code, and what each is for |
| [Testing](docs/testing.md) | What is tested, how, and what is deliberately not |
| [CI and release gates](docs/ci.md) | The six gates and the three release lanes |
| [Branding](docs/branding.md) | The mark, the wordmark, the palette and the voice |
| [`agile/`](agile/) | The working record: every item, plan and test sweep |

## Licences

Spagitty is **GPL-3.0-or-later**; see `COPYING`. The wordmark typeface (Inter)
is SIL Open Font License 1.1 (`assets/brand/font/OFL.txt`). Spagitty is not
affiliated with the Git project.
