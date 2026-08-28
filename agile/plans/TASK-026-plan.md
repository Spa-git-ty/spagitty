<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-026 — Plan

**Item:** [`agile/items/TASK-026-remove-every-remaining-shadow.md`](../items/TASK-026-remove-every-remaining-shadow.md)

## Approach

Find them all first, then decide the rule, then apply it. TASK-023 failed at
the first step: it flattened what was written as a token and did not survey what
was written literally, so the work looked complete and was not.

The survey is one grep for `box-shadow` across `src/`, read in full — 53
occurrences, sorted into three kinds: tokenised, literal-and-soft, and
literal-but-a-line.

## The rule

**A shadow is a blur radius.** That is what separates the fourteen things the
author is objecting to from the five things that would take structure with them
if they went. It is also mechanical, so it can be a test rather than a
judgement made again every time somebody adds a rule.

Nothing here is deleted for being a `box-shadow`. A focus ring is a `box-shadow`
and stays; a 12px inset glow is a `box-shadow` and goes.

## Decisions

- **The dark tokens first**, because four lines flatten around thirty call
  sites in both themes, and because that is where the miss actually was.
- **Information is kept, in a flat form.** The focused row's glow marked
  something real. It becomes a 2px accent bar rather than nothing — a flat
  interface still has to say which row the detail panel is showing.
- **Dead declarations are left for later.** Around thirty rules now resolve to
  nothing. Sweeping them would touch files that three open pull requests are
  editing, and handing the author avoidable conflicts costs more than the noise
  does.
- **The tokens stay declared as `none`** rather than being deleted, so the test
  has something to assert against and a future change is one edit.

## Files

- `src/app.css` — the four dark-theme tokens
- Eleven components — the literal shadows
- `src/lib/ui/flat.test.ts` (new)
- `agile/` — this triplet and the index row

## Steps

1. Survey every `box-shadow` in `src/` and sort it.
2. Dark tokens to `none`.
3. The literal shadows, keeping the lines and re-flattening the focused row.
4. `flat.test.ts`, run against `origin/dev` first.
5. Triplet and index row.

## Risks and rollback

- **This cannot be judged headless.** Amendment 4 holds and the wheel has not
  been handed over: whether the dark theme still reads as layered without its
  shadows is a question for the sweep, and it is the one real risk here — the
  dark palette was designed around them.
- **The focused row** is the one behaviour change, and the sweep checks it can
  still be told from a selected row.
- Rollback is the four token values and eleven declarations; nothing structural
  moved.
