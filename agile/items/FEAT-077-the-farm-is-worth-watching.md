<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-077 — The farm is worth watching

**Status:** Done
**Branch:** `feature/FEAT-077-farm-worth-watching`
**Screens:** Farm (1Q), Badges (1P).
**Raised by:** the author — *"make sure animations and feedback is cool &
expressive"*.

## Problem

A farm is *watched*, usually out of the corner of an eye while its operator is
doing something else. Everything the screen said had to be read:

- `3 / 7 done` as text, which tells you nothing at a glance and nothing at all
  about whether anything is happening right now.
- **Who is doing what** could only be answered by reading a dozen rows and
  matching agent names against statuses.
- **A run that had died looked exactly like a run that was thinking.** Nothing
  recorded when a run last said anything, so six minutes of silence and four
  minutes of being dead were the same screen.
- And the delight layer — 35 badges, a reward moment, a per-agent record — had
  been waiting since FEAT-072 for the farm to tell it anything.
  `AgentTaskEvent`'s own comment says so: *"Nothing in Spagitty emits it yet —
  the farm is what will"*. Half the catalogue reads it, and nothing had ever
  been scored.

## Change

**A ring instead of a fraction.** Done fills it; what is running is a brighter
arc at the leading edge, so a farm that is working looks different from one that
has stopped with the same amount finished; anything blocked colours the
remainder, because an unfinished farm and a stuck one are not the same state.
Its accessible name is the whole sentence, so nothing is carried by colour
alone.

**An agent strip.** One chip per working agent — who, on what, for how long —
above the plan. It is absent when nothing is running rather than leaving an
empty shelf, and a chip takes you to the task it names.

**A quiet run says so.** `AgentRun.last_output_ms` is written by the sink as
each line arrives, and after six minutes of silence the chip and the task row
say `No output for 6m 12s`, the dot stops breathing and turns amber. **Nothing
is stopped**: a model may think for a long time and killing it throws the work
away. The animation is the message — a farm you glance at says "still going" by
moving, so the one that stopped moving is the one to look at.

**The delight seam, connected.** A task that reaches `Done` hands the achievement
engine what it has always wanted to know: whether the tests really passed
(`unverified` is not a pass), whether the reviewer approved, how many times the
task was sent back, and whether the whole chain ran without a person. Agents
earn badges in this repository for work done in it, and the reward moment that
FEAT-072 built finally has something to announce.

**One clock.** Elapsed times and the quiet threshold are the only things on the
screen that change without an event; they share a single interval that ticks
only while something is running, so the header never shows two different nows.

## Scope

- `last_output_ms`, `quiet_for_ms`, and the sink that writes it.
- `ProgressRing`, `AgentStrip`, the shared clock, the quiet line on a row.
- `src/lib/farm/delight.ts` and the two events it feeds.

## Non-scope

- **Stopping a quiet run automatically.** Decided against with the author: a
  second, longer threshold that kills the run would throw away work that was
  merely slow, and the flag is what a person needs in order to decide.
- **Sound.** The delight layer already has it, off by default, and turning it on
  for the farm would be deciding for everybody.
- **A quiet threshold per farm.** Six minutes is a constant with its reasoning
  written beside it; making it a setting is worth doing when somebody's agent
  is genuinely slower than that.

## Acceptance criteria

- The ring shows done, running and blocked, and reads as a sentence to a screen
  reader.
- The strip names every working agent and what it is on, and is absent when
  nothing runs.
- A run silent past the threshold is marked, on its chip and on its row, and is
  never stopped by the farm.
- A task reaching `Done` scores its agent, once, with the truth about
  verification.
- Nothing animates for a reader who has asked for reduced motion.
