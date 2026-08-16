# GitLord

A cross-platform desktop Git client. The commit graph is the center of gravity;
every other view is one focused task.

GitLord uses standard git terminology — fetch, push, stage, hunk, `stash@{n}`,
pick/squash/reword/drop, ours/theirs — with no invented vocabulary.

## Status

Early. The application chrome and the Graph, Diff, Working copy, Conflicts,
Branches, Stash and All repositories screens are implemented; the remaining
screens are placeholders being built one at a time.

## Stack

- **Tauri 2** — desktop shell
- **Rust core** (`crates/gitlord-core`) — all git operations
- **[gix](https://github.com/GitoxideLabs/gitoxide)** — log walking, refs, diffing, blame
- **SvelteKit / TypeScript** — frontend, SPA mode (no SSR)

### The `git` binary boundary

Some git operations are not reimplemented in Rust. Interactive rebase execution,
hooks, LFS, submodule recursion and credential helpers shell out to the `git`
binary instead. That boundary lives in exactly one module —
`crates/gitlord-core/src/shell.rs` — and nothing else in the core spawns a
process. See the header of that file for the reasoning.

## Building

Requires a Rust toolchain, Node 20+, and the Tauri 2 system dependencies for
your platform (on Linux: `webkit2gtk-4.1`, `libsoup-3.0`).

```sh
npm install
npm run tauri dev      # development
npm run tauri build    # release bundle
```

## Documentation

- [docs/architecture.md](docs/architecture.md) — the three layers, the
  `gix`/`git` boundary, and how a repository is opened
- [docs/screens.md](docs/screens.md) — every screen, its route, and whether it
  is built
- [docs/testing.md](docs/testing.md) — headless checks, the fixture repository,
  and how to run the app for a visual sweep
- [docs/ci.md](docs/ci.md) — the six pipeline gates and what each one proves
- [agile/](agile/) — work items, plans and test plans

## Naming

The CLI binary is `gitlord`, never `git-lord`: git treats any `git-foo`
executable on `PATH` as a subcommand, so `git lord` would start working by
accident.

## License

GitLord is free software: you can redistribute it and/or modify it under the
terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version. See [LICENSE](LICENSE) for the full text, and [NOTICE](NOTICE) for
third-party components.

Contributions are accepted under GPL-3.0-or-later with a DCO sign-off. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## Trademark

> GitLord is not affiliated with, endorsed by, or sponsored by the Git project
> or the Software Freedom Conservancy. Git and the Git logo are trademarks of
> the Software Freedom Conservancy.

The Git logo is never used as GitLord's icon or in its icon set.
