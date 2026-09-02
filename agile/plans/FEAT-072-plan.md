<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-072 — Implementation plan

**Item:** [`agile/items/FEAT-072-delight-layer.md`](../items/FEAT-072-delight-layer.md)

## Approach

The design document is explicit that the delight system must not be wired
through the UI, and that is also what makes it safe: an achievement engine that
could throw inside a rebase would be the worst thing this feature could do. So
the shape is a one-way stream with a pure middle.

```
  git actions ──► watch.ts ──► delight (store) ──► engine (pure)
                                    │                   │
                                    ├──► sound          └──► unlocked badges
                                    └──► queue ──► RewardOverlay
```

Four rules held throughout:

1. **The engine is pure.** No storage, no clock, no Svelte, no `api`. That is
   what lets the whole rule set be a test table instead of a driven
   application.
2. **The store is told, never asks.** It holds no reference to `repo` — the
   shell hands it the repository and the identity. Importing `repo` back from
   the delight layer would close a cycle through half the frontend.
3. **One extra read, justified.** `commitLanded` reads the commit's own diff, so
   a badge can tell "you committed" from "you fixed it in four lines". Nothing
   else here reads anything.
4. **Nothing may fail a git operation.** Every call site is `void`-ed, and
   `record` swallows its own failure.

## Touched files

New:

- `src/lib/delight/{badges,events,engine,standings,card,sound,watch}.ts`
- `src/lib/delight/store.svelte.ts`
- `src/lib/delight/{BadgeChip,RewardOverlay}.svelte`
- `src/lib/delight/demo.ts`
- `src/lib/settings/PersonalitySection.svelte`
- `src/lib/settings/GodModeSection.svelte`
- `src/routes/badges/+page.svelte`
- `src/lib/delight/{engine,store,standings,card,sound,attribution,components,godmode}.test.ts`

Changed:

- `src-tauri/src/settings.rs` — `Personality`, `SoundLevel`, and a lenient
  deserializer so one bad enum value costs one setting rather than the file.
- `src/lib/types.ts`, `src/lib/settings/store.svelte.ts` — the two new
  settings, and `choose`/`write` beside `toggle` so a three-state setting is
  not written through a boolean flipper.
- `src/lib/nav.ts`, `src/lib/ui/icons.ts`, `src/lib/palette/commands.ts` — the
  Badges screen, its icon and its command.
- `src/routes/+layout.svelte` — mounts the overlay, binds the repository and
  the identity.
- Call sites: `changes/store`, `graph/actions`, `rebase/store`,
  `conflicts/actions`, `reflog/actions`, `network/store`, `branches/store`.

## Steps

1. Catalogue, events and engine, with the rule table and its tests first — the
   rules are the feature, and everything else draws them.
2. The store: per-repository `localStorage`, the actor record, the queue.
3. The settings, across the language boundary, with the Rust tests.
4. The surfaces: badge, reward moment, screen, settings section.
5. The wiring, one call site at a time, each `void`-ed.
6. God mode, so the other four steps can be looked at without earning anything.
7. The record, and `tools/record.test.ts`.

## Decisions worth recording

- **`localStorage`, not `src-tauri`.** The layer must stay off the git and
  settings paths. A lost record is a record of badges, not of work — git is
  always the authority on what happened.
- **Per repository.** "Which agent does well" is a question about *this*
  codebase. A global tally would average a Rust workspace against dotfiles.
- **Sound off by default.** The same rule the rest of `settings.rs` follows: a
  preference nobody set must not change what the application does.
- **Professional silences sound in the same write.** A level that displays
  `full` and plays nothing looks broken.
- **God mode's writes live in the store, not in the section that draws them.**
  They are the only writes in the application that bypass the engine, and they
  belong beside the code that awards the ones people earned, where the two can
  be read against each other.
- **Seeding agents runs real tasks through the real engine.** A seeded number
  the rules could never have produced would make God mode a worse testing tool
  than no testing tool.
- **Gatekeeper is `🚧`, not the shield the document gave it.** Regression
  Slayer already has the shield, and two shields in one actor's row is a badge
  nobody can name at a glance. The `🍝` collision between Spagitty Chef and
  Actual Spaghetti is kept, because that one is the joke and the two never
  share a grid.
