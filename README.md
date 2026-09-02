# Spagitty

![Spagitty](assets/brand/hero.png)

**Untangle the work — yours, and your agents'.**

Spagitty is a local-first desktop Git client for repositories where people and
coding agents commit side by side. It is where that work is read, reviewed and
landed — not where agents are run. Nothing in it is a model; nothing leaves the
machine unless you ask it to.

The name is *spa-gi-ty*: spaghetti + Git. A repository without a readable
history is a plate of tangled pasta. Spagitty's job is to straighten the
strands so you can see what happened, who did it, and what to do next.

## What it is

A **desktop application** (Tauri + Rust + Svelte), not a web service.

| Layer | Role |
| --- | --- |
| `src/` | SvelteKit frontend. One store per screen. Never talks to Git directly. |
| `src-tauri/` | Thin Tauri shell: one open session, commands, watcher. |
| `crates/spagitty-core/` | Every Git operation, via `gix` and the `git` binary. |

Only `src/lib/api.ts` crosses from the UI into the backend. Repositories stay on
disk. Forge tokens live in the OS keychain. The webview holds neither.

## What you can do with it

### History and the working copy

- **Commit graph** — branches, tags and lanes, with the walk rooted at the
  refs you choose: hide, solo, pin, or smart visibility for the branch you are
  on and its trunk.
- **Working copy** — stage and unstage by file, hunk or line; discard with a
  clear account of what goes away.
- **Diffs** — syntax highlighting across a dozen grammars; image comparison
  (side by side, swipe, onion skin); binary size deltas; search inside the
  patch text, not only the commit message.
- **File history and blame** — a file's timeline with rename following, and a
  line-by-line blame gutter that links back into the graph.

### Branches of work

- **Branches, tags, stashes, reflog** — each as its own screen, not a dialog.
- **Worktrees** — several checkouts of one repository, switched from the tab
  strip; add, lock, unlock, remove, prune.
- **Submodules** — status, recursive update, sync, deinit.
- **Interactive rebase and conflicts** — plan a rebase, resolve conflicts in
  place, or hand them to an external merge tool (VS Code, Meld, Beyond Compare,
  KDiff3, Sublime, Vimdiff, …).

### Review and forges

- **Pull requests** — GitHub, GitLab and Bitbucket Cloud. Read, review with
  inline comments, create, merge (merge / squash / rebase), close, reopen and
  mark ready — without leaving the app.
- **Log search** — author, message, path, date range, and diff content together.
- **Clone, fetch, push** — from the toolbar, with the git command behind each
  action available when you want to see it.

### Identity and the machine

- **Identity profiles** — name, email and signing key as named profiles,
  switched from the status strip, so a work commit is not signed with a
  personal key by accident.
- **Signing** — reads whether git would actually sign (`commit.gpgsign` and
  friends), not a Spagitty preference pretending to be that.
- **Themes** — light and dark palettes; the accent follows the brand amber and
  darkens on light surfaces for contrast.
- **Command palette** — jump to any screen or action from the keyboard.

### For repositories with agents in them

Agents commit fast, in volume, and often overnight. Spagitty is built for the
review that follows.

- **Attribution** — commits are credited from `Co-authored-by` trailers agents
  already write. A human and the agents working beside them are tracked
  separately.
- **Standings** — agents ranked by first-pass rate (how often the work landed
  without a fix), never by commit volume.
- **The delight layer** — badges and titles for clean commits, survived rebases,
  recovered work and conflicts resolved. Never for time spent in the app.
  Agents earn on the same rules a person does. Personality (Professional /
  Balanced / Full Spagitty) and Sound (off / subtle / full) control how loudly
  any of it speaks; God mode in Settings can fire any of it on demand.

## What it is not

- Not a hosted Git forge, CI system, or agent runner.
- Not "AI-powered". There is no model inside Spagitty.
- Not a thin wrapper around `git` in a terminal skin — the graph, review
  workspace and attribution are the product.

## Screens

Every built screen, by the code used in commits and conversation:

| Code | Screen | Route |
| --- | --- | --- |
| 1A | Graph | `/` |
| 1B | Diff | `/diff` |
| 1C | Working copy | `/changes` |
| 1D | Conflicts | `/conflicts` |
| 1E | Interactive rebase | `/rebase` |
| 1F | Branches | `/branches` |
| 1G | Stash | `/stash` |
| 1H | Pull requests | `/requests` |
| 1I | Log search | `/search` |
| 1J | All repositories | `/repos` |
| 1K | Settings | `/settings` |
| 1L | Clone | modal |
| 1M | Reflog | `/reflog` |
| 1N | Tags | `/tags` |
| 1O | File history | `/history` |
| 1P | Badges | `/badges` |

Full detail: [docs/screens.md](docs/screens.md).

## Run it

```sh
bun install
bun run tauri dev      # the desktop app
bun run check          # typecheck
bun run test           # vitest
bun run coverage       # vitest with the Amendment 10 branch-coverage floor (70%)
```

Rust and the WebKitGTK build dependencies are required for the desktop build.
The automation contract — six gates, coverage floor, three release lanes — is
[docs/ci.md](docs/ci.md).

Current version: **0.3.0** (`0.x`: the surface is not yet stable).

## Documentation

| Doc | What it is for |
| --- | --- |
| [Architecture](docs/architecture.md) | The three layers, and the rule that only `api.ts` calls the backend |
| [Screens](docs/screens.md) | Every screen, by code, and what each is for |
| [Testing](docs/testing.md) | What is tested, how, and what is deliberately not |
| [CI and release](docs/ci.md) | The six gates and the three release lanes |
| [Branding](docs/branding.md) | Mark, wordmark, palette, voice, and the words we lead with |
| [Amendments](docs/AMENDMENTS.md) | Standing rules the working record is written against |
| [`agile/`](agile/) | Every item, plan and test sweep — the working record |
| [Contributing](CONTRIBUTING.md) | How to send a change |

### Notes for agents working in this repo

- Prefer the working record under `agile/` over inventing process. Status of an
  item is authoritative there.
- Do not invent brand copy. The approved tagline and descriptors live in
  [docs/branding.md](docs/branding.md); regenerate collateral with
  `python3 tools/make-brand.py` (and `tools/make-icons.py`) — never hand-edit
  the derived PNGs.
- Never use the Git logo or Git orange (`#F05133`). Spagitty is independent.
- Frontend tests run under happy-dom via vitest; Rust tests live beside the
  core. The coverage floor is branch coverage, not line coverage.
- Changelog entries go under `## [Unreleased]` in the same change as the work
  (Amendment 20). Gate 6 reads that file for release notes.

## Licences

Spagitty is **GPL-3.0-or-later**; see [`COPYING`](COPYING). The wordmark
typeface (Inter) is SIL Open Font License 1.1
(`assets/brand/font/OFL.txt`). Spagitty is not affiliated with the Git project.
