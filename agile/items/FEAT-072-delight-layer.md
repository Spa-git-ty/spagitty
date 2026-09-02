<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-072 — The delight layer: badges, titles and reward moments

**Status:** Done.
**Screens:** Badges (1P), Settings (1K), shell.
**Raised by:** `SPAGITTY_HOW_TO_COOL_YOUR_SOFTWARE.md`.

## Problem

Every git client treats every successful operation the same way. A merge that
took forty minutes and a `git status` that took nothing both end in the same
grey line, and nothing in the application can tell the difference between work
that was skilful and work that happened to compile.

That matters more than it sounds, and it matters more now than it used to. As
agents start doing the implementation, the question stops being "did this
build" and becomes "who does good work in this repository, and how do I know".
Nothing in Spagitty could answer that, because nothing in Spagitty was keeping
score of anything worth scoring.

## Change

An **achievement engine** — an event stream, a rule set and a per-actor record —
sitting entirely beside the git layers, and the surfaces that make it felt.

- **The engine** (`src/lib/delight/engine.ts`): pure. Events in, counters and
  unlocked badges out. Rules run to a fixed point so an evolution chain lands
  in one moment rather than one badge per unrelated event.
- **The catalogue** (`badges.ts`): 35 badges across git skill, engineering
  quality, agent performance, recovery, a Hall of Shame and four legendaries.
  Rarity and category are separate axes; secret is a flag.
- **Actors.** Every record is per actor and per repository. A human is keyed on
  their git email, so a profile switch (FEAT-069) switches record. An agent is
  keyed on its slug, and is credited **today** by reading `Co-authored-by`
  trailers — the way agents already sign their work.
- **The reward moment** (`RewardOverlay.svelte`): a beat of silence, then a
  card, then it leaves. Never blocking, never focus-trapping, never in the way
  of the pointer. Only a legendary badge dims the window.
- **Sound** (`sound.ts`): synthesised, not sampled. Off by default. Rarity is
  audible, so a legendary badge is recognisable without looking.
- **Badges (1P)**: what has been earned here, by whom, with titles, an agent
  comparison for this repository only, and a text share card.
- **Personality** (Settings → Personality): Professional, Balanced, Full
  Spagitty. Opt-in *intensity*, never opt-in existence.
- **God mode** (Settings → God mode): the layer driven by hand. Preview any
  card without earning it, fire the events the application really produces,
  grant or revoke straight into the record, seed three agents, and play every
  sound. Every other badge takes real work to see, which is the point of them
  and also the problem: nobody can check that Git Lord looks right without
  earning Git Lord.

## The rule the whole feature is written against

**Nothing rewards usage.** No badge for opening Spagitty, for committing often,
for time in the window, for tokens spent. Every rule in `engine.ts` is earned by
a skill, a recovery, or something funny enough to tell somebody about. The
`summary` test asserts this directly, because it is the constraint that would
be quietest to lose.

## Non-scope

- **Signed achievements** (`§27` of the source document). Badges are local, and
  a record in `localStorage` is not evidence. Worth doing the day badges appear
  somewhere they can be claimed rather than shown.
- **Team and repository achievements** (`§22`, `§23`). Both need a shared
  record; there is none.
- **The agent farm itself.** `AgentTaskEvent` and `ReviewEvent` are defined and
  ruled on but nothing in Spagitty emits them yet — the farm will. They are
  here rather than later because half the catalogue reads them, and a rule with
  no event shape is a rule nobody can test.

## Acceptance criteria

- Badges are earned at every personality level; only the announcement changes.
- Sound is silent until it is chosen, and a host with no audio is a no-op.
- No shame badge reaches a reward moment, a title, or the exported markdown.
- A secret badge gives nothing away before it is found, and the `n / ??` count
  does not let the secrets be worked out by arithmetic.
- Nothing in `src/lib/delight/` can fail a git operation.
- Every God mode demo earns something, or says in its own description that it
  is a step towards something.
- `tools/record.test.ts` passes.

## Known host requirement

On Linux, WebKitGTK renders Web Audio through GStreamer, and the sink its
pipeline ends in — `autoaudiosink`, from **`gst-plugins-good`** — is a separate
package a desktop can be running without. Without it the `AudioContext` reports
itself `running`, every oscillator starts and stops exactly as asked, and no
sample reaches the speakers. Nothing in the page can tell that apart from
success, so God mode reports the device state and names the package rather than
leaving somebody clicking a button that has already done its job.

## Fixed in passing

Three defects found while this was being built and driven, none of them from
this work:

- **The Accounts chip had no branch.** `src/routes/settings/+page.svelte` drew
  eight chips and had seven branches; `accounts` fell through the closing
  `{:else}` and rendered the License section, while `AccountsSection` was drawn
  under You the whole time. The chip is gone, `#accounts` resolves to You, the
  catch-all is gone with it, and `sections.test.ts` now reads the route and
  fails if a chip is ever added without a branch.
- **The Open repository button pushed its own label to the far right.** Its
  icon and label were direct children of `.item`, which lays out with
  `space-between` so that a screen's count can sit at the right. Grouped in a
  `.name`, as every other row already does.
- **External Tools ignored the theme**, in two separate ways. It was written
  against `--fg`, `--dim` and `--bg-2`, none of which exist, so every one fell
  through to a hard-coded dark hex. `flat.test.ts` now checks every component's
  `var(--token)` against what `app.css` and the JavaScript-published metrics
  actually define; eleven more components do the same thing and are recorded
  there as a shrinking list — a theming pass of their own, not a passenger to
  the next change.
- **And every `<select>` in the application was the platform's.** `app.css`
  styles `input`, `textarea` and `select` together and looked as though it
  covered them, but a select ignores all of it and paints the desktop's own
  widget unless `appearance: none` says otherwise — a white field with a grey
  label, in a dark window. It was true of all five: both External Tools
  pickers, the worktree modal's branch picker and both pull-request pickers.
  Fixed once, in `app.css`, with the chevron drawn from two gradients in
  `currentcolor` — an inlined SVG cannot read a custom property, so it would
  have been one hard-coded colour in every theme, which is the defect above
  again.

## What is not reachable yet

`force-push-and-pray` cannot be earned: Spagitty never passes `--force-with-lease`
from the UI, and this item did not add a way to. The event carries the flag, the
rule is written, and the badge lights up the day a force push exists.
