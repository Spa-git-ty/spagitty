<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-033 — Plan

**Item:** [`agile/items/FEAT-033-branch-divergence-on-the-chip.md`](../items/FEAT-033-branch-divergence-on-the-chip.md)
**Branch:** `feature/FEAT-033-divergence-on-the-chip`
**Status:** implemented.

**Branch point.** Cut from `feature/FEAT-018-finish-fetch-push`, continuing the
unmerged stack — and after it on purpose: FEAT-018 made the Branches screen say
how stale its counts are, and these are the same counts.

## Approach

### The data question first

The item said this is a data question before it is a presentation one, and it
was right. `refs.rs` builds a chip from the refs pointing at a commit; the
counts come from `branches.rs`, which walks refs separately. Two reads.

The item also made *not* having two reads a criterion: "the counts on the chip
and the counts on the Branches screen never disagree — they come from one read,
not two."

So `branches::divergences` is new: every local branch that has an upstream, by
short name, counted once. **Both consumers use it.** `branches::list` looks its
rows up in the map instead of computing them inline, and `RefIndex::build` calls
the same function and attaches the result to each chip with a local ref.

That is a genuine refactor rather than a second call site: the counting code
that used to live in the middle of `list`'s loop now has one home, and if it is
ever wrong it is wrong in both places at once, which is the honest failure mode.

### What carries a divergence, and what cannot

`divergence` is `None` for three different reasons, and they are all the same
answer to the reader:

- **A tag** has no upstream to diverge from.
- **A branch with no upstream** has nothing to compare against — absent from the
  map, not zeroed. "Level" and "nothing to compare against" are different, and a
  chip must not draw the first for the second.
- **A remote-only chip** *is* the upstream.

### Level says nothing, and still answers when asked

A level branch is absent from the chip's drawing and present in its `title`.
Those are not in tension: `0/0` on every row is noise on every row, and the
graph's gutter is the most crowded place in the application — but "am I level
with origin?" is a real question, and the tooltip has room for the answer.

That is why the title is gated on `chip.divergence` and the mark on a derived
`drift` that treats level as nothing. One flag would have forced the two to
agree, and they should not.

### Behind then ahead, in the bar's colours

`↓3 ↑2`, in that order, in `--lane-2` and `--lane-1` — the same order and the
same two colours FEAT-047's divergence bar uses on the Branches screen. Two
places showing one fact should not disagree about which way round it is.

Text rather than a miniature bar: the bar is scaled against the widest
divergence *on screen*, which is a property of a list. A chip is not in a list
of comparable chips — it sits beside a commit — so there is nothing to scale
against and a number is the honest form.

The `title` carries the whole sentence, word for word the same as the Branches
screen's, so nothing here is glyph-only.

## What was not done

- **Fetching from the chip**, and any statement of how old the counts are. The
  item puts both out of scope; FEAT-018 now says the age on the Branches screen.
- **A divergence on a remote-only chip**, which would be the same number seen
  from the other end and drawn twice.
