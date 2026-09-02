<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-072 — Automated tests

**Item:** [`agile/items/FEAT-072-delight-layer.md`](../items/FEAT-072-delight-layer.md)
**Plan:** [`agile/plans/FEAT-072-plan.md`](../plans/FEAT-072-plan.md)

## What was written

The engine is pure, so its suite is a table rather than a driven application.
What is asserted is deliberately *not* "the rule fires" — that is a restatement
of the rule, and it is the kind of test that gets deleted the first time a
threshold is retuned. What is held is the behaviour that would be silent if it
broke.

| Test | Layer | What it asserts |
| --- | --- | --- |
| `gives every rule a badge that exists` | `src/lib/delight/engine.test.ts` | The catalogue and the rule set cannot drift apart. |
| `gives every badge a rule, so none of them is unearnable` | `src/lib/delight/engine.test.ts` | The inverse, and the one that matters more: a badge with nothing awarding it is a slot that stays grey forever. |
| `points every evolution at a badge that exists` | `src/lib/delight/engine.test.ts` | The chains in `after` resolve. |
| `gives a badge once, however many times it is earned again` | `src/lib/delight/engine.test.ts` | The rules are thresholds, not triggers. |
| `lands a whole chain in one moment` | `src/lib/delight/engine.test.ts` | The fixed point. One pass would award the prerequisite now and the badge that depends on it on the next unrelated event. |
| `never takes a badge away when a streak is broken` | `src/lib/delight/engine.test.ts` | A reputation that can be silently revised is not a reputation. |
| `keeps a badge this build does not know rather than dropping it` | `src/lib/delight/engine.test.ts` | Going back a version must not cost somebody a badge. |
| `will not call the first commit in a repository a surgical fix` | `src/lib/delight/engine.test.ts` | `git init` earning a rare badge would be the first thing anybody saw and the last one they believed. |
| `calls a commit spaghetti only when it is both wide and scattered` | `src/lib/delight/engine.test.ts` | Thirty files in one directory is a rename, not a mess. |
| `wants tests beside an implementation, not tests on their own` | `src/lib/delight/engine.test.ts` | Test Goblin is about a habit, not about a commit. |
| `does not count a fast-forward as a merge` | `src/lib/delight/engine.test.ts` | A fast-forward moves a pointer; nothing was folded together. |
| `treats a rebase that fought back as a recovery` | `src/lib/delight/engine.test.ts` | And that a clean one is not one. |
| `needs six checkouts inside the window to call it a burst` | `src/lib/delight/engine.test.ts` | Both directions, against `LIMITS`. |
| `counts one long debugging session as one burst` | `src/lib/delight/engine.test.ts` | The reset, without which every checkout after the sixth is a new burst. |
| `needs green tests, an approval and no corrections for a first try` | `src/lib/delight/engine.test.ts` | All three, each falsified on its own. |
| `breaks the first-pass streak on a task that needed work` | `src/lib/delight/engine.test.ts` | Current and best kept apart. |
| `leaves the record it was given alone` | `src/lib/delight/engine.test.ts` | `apply` does not mutate, which the store relies on. |
| `credits the agent a co-author trailer names` | `src/lib/delight/attribution.test.ts` | The one way an agent earns a reputation today. |
| `credits nobody for a body that merely mentions a model` | `src/lib/delight/attribution.test.ts` | The failure that would matter: generosity here makes the agent comparison worthless from day one. |
| `is not fooled by a branch that starts with one of them` | `src/lib/delight/attribution.test.ts` | `mainly-tests` is not `main`. |
| `never throws, whatever it is handed` | `src/lib/delight/store.test.ts` | The guarantee the whole feature rests on. This call sits on the line after a commit succeeded. |
| `survives storage that refuses to be written` | `src/lib/delight/store.test.ts` | A full quota costs a badge, not the count and not the commit. |
| `starts empty in a different repository` | `src/lib/delight/store.test.ts` | Per-repository, which is the only scope the numbers mean anything in. |
| `ignores a stored record it cannot read` / `from a version it does not know` | `src/lib/delight/store.test.ts` | Hand-edited or future storage is not fatal. |
| `keys the record on the git email, so a profile switch switches record` | `src/lib/delight/store.test.ts` | FEAT-069's profiles exist to separate work; the record follows. |
| `earns the badge at Professional all the same` | `src/lib/delight/store.test.ts` | Personality is intensity, never existence. |
| `never gives a shame badge a reward moment` | `src/lib/delight/store.test.ts` | Celebrating somebody for committing to main with the recovery animation is the joke landing on the wrong person. |
| `refuses a shame badge, because the Hall of Shame is not a wardrobe` | `src/lib/delight/store.test.ts` | Titles. |
| `schedules nothing when the level is off` / `does not even build a context` | `src/lib/delight/sound.test.ts` | A silent install must not open an audio device. |
| `is a no-op on a host with no audio` / `when the host throws` | `src/lib/delight/sound.test.ts` | Both refusal shapes. |
| `schedules only after a suspended context has resumed` | `src/lib/delight/sound.test.ts` | The bug that made the *first* sound the one guaranteed not to be heard: a suspended context's clock is frozen at zero, so scheduling before the resume laid every tone in a window the clock had already passed. |
| `survives a host whose resume returns nothing` | `src/lib/delight/sound.test.ts` | `resume()` is specified to return a promise; an older WebKit does not, and a missing return value must not become a `TypeError` inside a click handler. |
| `makes a legendary badge a bigger sound than a common one` | `src/lib/delight/sound.test.ts` | Recognisable by sound alone means it cannot be the small one again. |
| `gives every rarity a cue of its own` | `src/lib/delight/sound.test.ts` | Five distinct cues, not one played five times. |
| `is the same width all the way down` | `src/lib/delight/card.test.ts` | The card is pasted somewhere monospaced. Measured in **columns**, because counting code points calls a correct card wrong. |
| `wraps a line too long for the box rather than widening it` | `src/lib/delight/card.test.ts` | The wrap uses the same measure. |
| `leaves the Hall of Shame at home` | `src/lib/delight/card.test.ts` | The joke is between a developer and their own repository. |
| `shows a locked secret as a slot with nothing in it` | `src/lib/delight/standings.test.ts` | Shown, not omitted — a list that ended would say the collection was complete. |
| `leaves the secrets out of the denominator` | `src/lib/delight/standings.test.ts` | The `n / ??`. A total that gives the count away removes the reason secrets exist. |
| `has no human on it` | `src/lib/delight/standings.test.ts` | Ranking the person against the models they supervise is the productivity leaderboard the document says not to build. |
| `ranks by first-pass rate rather than by how much work it was given` | `src/lib/delight/standings.test.ts` | Volume rewards whoever was given the most work. |
| `counts outcomes, never time spent` | `src/lib/delight/standings.test.ts` | The constraint the whole feature is written against, asserted directly. |
| `says nothing at all about a secret nobody has found` | `src/lib/delight/components.test.ts` | Including in the accessible name. |
| `waits a beat before it appears` | `src/lib/delight/components.test.ts` | The silence is the feature. A card in the same frame reads as part of the operation. |
| `never takes the pointer from the window underneath` | `src/lib/delight/components.test.ts` | And that only a legendary badge dims. |
| `queues a card without earning anything` | `src/lib/delight/godmode.test.ts` | A preview writes nothing. |
| `will show a shame badge, which nothing else does` | `src/lib/delight/godmode.test.ts` | The anti-badges are the cards whose wording is most worth checking, and nothing else in the application will show one. |
| `takes the title off with the badge it pointed at` | `src/lib/delight/godmode.test.ts` | A title pointing at a revoked badge would draw as nothing. |
| `writes through to storage, so it survives a rebind` | `src/lib/delight/godmode.test.ts` | A testing tool that quietly does nothing makes the thing being tested look broken. |
| `leaves the person at the keyboard out of it` | `src/lib/delight/godmode.test.ts` | Seeding agents seeds agents. |
| `produces rates the rules could actually have produced` | `src/lib/delight/godmode.test.ts` | Seeded through the real engine, not written as stats. |
| `earns something with every demo that does not say otherwise` | `src/lib/delight/godmode.test.ts` | Every button does something, and the only ones allowed not to are the ones that declare it. |
| `steps the clock across a checkout burst` | `src/lib/delight/godmode.test.ts` | Six checkouts at one instant is one checkout six times. |
| `the_delight_layer_is_balanced_and_silent_until_it_is_asked_otherwise` | `src-tauri/src/settings.rs` | The two defaults, and why sound is the one that must never start on. |
| `a_personality_this_build_does_not_know_costs_only_the_personality` | `src-tauri/src/settings.rs` | The lenient deserializer. Without it, one hand-edited typo silently undoes every other setting in the file. |
| `the_personality_levels_are_stored_as_the_names_the_screen_uses` | `src-tauri/src/settings.rs` | The wire names, on both sides of the boundary. |

## Tests written for the defects found in passing

| Test | Layer | What it asserts |
| --- | --- | --- |
| `gives every chip a branch that renders it` | `src/lib/settings/sections.test.ts` | The Accounts defect. A catch-all cannot tell a section it does not know from the section it was written for, so the screen has none and this reads the route to prove every chip is handled. |
| `names no section the index does not have` | `src/lib/settings/sections.test.ts` | The other direction — a branch left behind after a chip is removed. |
| `has no Accounts chip, because connecting a host is part of You` | `src/lib/settings/sections.test.ts` | And that `AccountsSection` is still drawn. |
| `follows a fragment, which is how Pull requests links to Accounts` | `src/lib/settings/store.test.ts` | Changed: `#accounts` now resolves to You, so the two buttons on the Pull requests screen still arrive at the accounts. |
| `is true of every component but the ones already recorded` | `src/lib/ui/flat.test.ts` | The theming defect, and the only way to see it: `var(--nope, #eee)` is valid CSS that works, so nothing fails and nothing warns. |
| `keeps no stale row in the recorded list` | `src/lib/ui/flat.test.ts` | The eleven known offenders are a shrinking debt, not an exemption — fixing one fails until its row is deleted. |
| `and the section that was reported is one of the fixed ones` | `src/lib/ui/flat.test.ts` | External Tools specifically. |
| `stops a select drawing itself` | `src/lib/ui/flat.test.ts` | `appearance: none`, and the WebKit prefix with it. Without it a select is the platform's white widget whatever the stylesheet says. |
| `draws the arrow in a colour that follows the theme` | `src/lib/ui/flat.test.ts` | Gradients in `currentcolor`, and explicitly **not** an inlined SVG — a data URI cannot read a custom property, so it would be one hard-coded colour in every theme. |
| `never resets the field background with the shorthand` | `src/lib/ui/flat.test.ts` | `background:` on hover or focus would wipe the chevron out. Anchored at line start so `::selection` is not mistaken for a field rule. |

## Tests that closed the coverage gap

The Amendment 10 floor is seventy percent of branches. FEAT-072 landed under
it; the suites below are the ones that brought it back over. Most of them cover
work that was already Done — FEAT-047, FEAT-062, FEAT-065, FEAT-067, FEAT-068,
FEAT-069, FEAT-019 — and are recorded here because that is the item that needed
the floor held.

| Test | Layer | What it asserts |
| --- | --- | --- |
| the mode / smart / pinning / persistence suites | `src/lib/graph/visibility.test.ts` | What the backend is told when the three buttons change, and that a selection survives a restart under the repository it belongs to. |
| the mounted External Tools section | `src/lib/settings/ExternalToolsSection.test.ts` | What the section draws. The older suite called the api and never mounted it, which is how three missing CSS tokens shipped without a failure. |
| the mounted Signing section | `src/lib/settings/SigningSection.test.ts` | Signing that is on and will not work — missing program, no key for the format, editing a file that is not the one deciding. |
| `trims what it saves, and derives a stable id from the trimmed label` | `src/lib/settings/ProfilesSection.test.ts` | The id comes from the trimmed label, not the raw one. Deriving it from what was typed gave `  Work Laptop ` the id `--work-laptop-`. |
| `gives two labels differing only in punctuation two different ids` | `src/lib/settings/ProfilesSection.test.ts` | One dash per run; `Work (laptop)` does not leave a trailing dash. |
| the rest of the Profiles section mount | `src/lib/settings/ProfilesSection.test.ts` | Refusal, apply-to-repo vs global, and surviving a failed save without throwing the form away. |
| sizes and deltas of a binary file | `src/lib/diff/BinaryDiff.test.ts` | Every direction of the size arithmetic, including a file whose bytes changed but whose size did not. |
| `what happens when git says no` | `src/lib/worktrees/store.test.ts` | Every failure path FEAT-062 left out, and that a slow listing cannot overwrite a newer one. |
| `what happens when git says no` | `src/lib/submodules/store.test.ts` | The same for FEAT-067: report, clear busy, and still throw so a modal does not close as though it worked. |
| the worktree dialog stack | `src/lib/worktrees/modal.test.ts` | Opening the add form hides the manager; closing it leaves the manager where it was. |
| the submodules dialog | `src/lib/submodules/modal.test.ts` | Showing twice leaves it open — the palette and the tabs menu can both ask. |

## Tests that were changed

| Test | Why |
| --- | --- |
| `runs the screens in the order they are worked through` | `src/lib/nav.test.ts` — Badges joins the rail, after Reflog and before the divider. |
| `finds a command by its initials, which is the point of the palette` | `src/lib/palette/commands.test.ts` — "Go to Badges" and "Go to Branches" now share `gtb`, and the shorter title wins the tie. That is the documented ranking rule; the example it was asserted with had simply stopped being unambiguous. |
| Settings fixtures in `api.test.ts`, `sections.test.ts`, `store.test.ts` | Two new keys on `Settings`. |
| `lastHeld` in `visibility.test.ts` | The pinned argument is optional in the api signature; treating it as required failed `bun run check`. |

## How to run

```sh
bun run test                       # the whole frontend suite
bunx vitest run src/lib/delight    # this feature alone
cargo test -p spagitty --lib settings
```
