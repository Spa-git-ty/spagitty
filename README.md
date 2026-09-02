# Spagitty

![Spagitty hero](assets/brand/hero.png)

A desktop Git client that untangles your repositories — spaghetti above, a
commit graph below, straight to the commit you're looking for.

The name is *spa-gi-ty*: a repo without histories, remotes, and review trails
is a plate of tangled pasta, and a VCS's job is to straighten it. The [brand
guide](docs/branding.md) explains the mark, the wordmark, and the palette that
everything below is drawn from.

## Highlights

- Cross-platform desktop app built on Tauri; Svelte frontend, Rust backend.
- Local-first: repositories stay on disk, the workspace is a plain directory,
  and nothing is sent anywhere without you asking.
- Commit graph with branch, tag, and lane rendering.
- Pull-request review workspace with structured diffs and markdown panes.
- Native tray/menubar presence with a brand sheen (monochrome on macOS).

## Getting started

```sh
bun install
bun run check     # typecheck
bun run test      # vitest
bun run tauri dev # the desktop app
```

The full automation contract — gates, coverage floors, and release steps — is
in [docs/ci.md](docs/ci.md). Methodology lives in [`agile/`](agile/).

## Documentation

- [Architecture](docs/architecture.md)
- [CI and release gates](docs/ci.md)
- [Testing](docs/testing.md)
- [Screens](docs/screens.md)
- [Branding](docs/branding.md)

## Licences

Spagitty is **GPL-3.0-or-later**; see `COPYING`. The wordmark typeface (Inter)
is SIL Open Font License 1.1 (`assets/brand/font/OFL.txt`). Spagitty is not
affiliated with the Git project.