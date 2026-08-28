<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-026 — Remove every remaining shadow

**Status:** Open on `task/TASK-026-polish-pass`.
**Screens:** all.
**Raised by:** the author, for the second time: "remove all shadows i want it
all flat dont bring back shadows". The first time was TASK-023 — "ok also
remove shadows !".

## Problem

Asking twice is the problem. TASK-023 flattened the interface on the author's
instruction and was believed done; shadows were still on screen afterwards, in
two places its approach could not reach.

**The dark theme kept its own values.** TASK-023 set `--shadow-1`, `--shadow-2`,
`--shadow-3` and `--sheen` to `none` on the light `:root`. The
`:root[data-theme='dark']` block declares all four again, with real values, and
those were left alone. So every pane reading `--shadow-3` or `--sheen` — the
dialog, the toast, the palette, the file columns, the repository cards, the
request rows — still cast and still caught light, in one theme out of two.

**A dozen shadows were written out literally**, where no token change could
reach them: the toolbar and the graph header casting onto the content under
them, the active repository tab, the command log's two large upward casts, the
avatar disc, the pressed and destructive states of a button, the splitter's
glow, two indicator glows in the nav rail, the commit detail panel's edge, and
the inset accent glow marking the focused row.

Fourteen soft shadows in total, which is what `flat.test.ts` lists when it is
run against the code before this change.

## Change

- The four dark-theme tokens become `none`, which is the single edit that
  flattens every tokenised call site in both themes at once. The paragraph
  above that block — separation in the dark coming from shadow density — is
  corrected rather than left to contradict the code.
- The twelve literal shadows are removed. Where one carried information rather
  than decoration, the information is kept in a flat form: the active tab keeps
  its accent underline, and the focused commit row trades its 12px inset glow
  for a 2px accent bar down its leading edge, which still tells it apart from a
  selected row tinted across its width.
- `src/lib/ui/flat.test.ts` makes it enforceable.

## What stays, and why it is not a shadow

**The rule is the blur radius.** Every shadow removed here had a blur of 3px or
more; everything still using `box-shadow` has a blur of exactly zero and is a
line:

- the **focus ring**, `0 0 0 3px var(--ring)`. Removing this is an
  accessibility regression, not a flattening;
- the **hairline around an avatar**, `0 0 0 1px var(--line)`;
- the **rules either side of the graph's lane band**, and the **accent bars**
  under an active tab and down a focused row.

Each is a border drawn with the one property that does not change an element's
size. Taking them away would delete structure rather than decoration.

## Non-scope

- **The dead declarations.** Around thirty rules still say
  `box-shadow: var(--glass-rim), var(--shadow-1)`, which now resolves to nothing
  in both themes. They paint nothing and are harmless, but they are noise, and
  sweeping them touches files that three open pull requests are already
  editing. Worth doing on its own once those land.
- The `--shadow-*` and `--sheen` tokens themselves. They stay declared, and
  `none`, so that the test above has something to assert and so a future
  reinstatement is one edit in one place rather than thirty.

## Acceptance criteria

- No `box-shadow` anywhere in `src/` has a non-zero blur radius.
- Every shadow and sheen token is `none` in **both** theme blocks.
- The focus ring, the lane-band rules and the two accent bars are still drawn.
- The focused commit row is still tellable from a selected one.

## Dependencies

Finishes what TASK-023 started. Independent of the glass work, which gave the
floating panes an edge as a **border** rather than as the rim shadow TASK-023
removed — the two do not disagree.
