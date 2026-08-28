<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-024 — Plan

**Item:** [`agile/items/TASK-024-the-glass-reads-as-glass.md`](../items/TASK-024-the-glass-reads-as-glass.md)

## Approach

Change the material, not the layout. All five floating panes already read the
same two tokens, so the material has exactly one seam and the fix lands there;
the only per-component edit is the edge, which is a border and therefore
belongs to the element rather than to a token.

The constraint the author stated — the version that looked right destroyed the
frame rate — is treated as the budget rather than as background. The blur
radius is the expensive half of this material and it is left exactly where it
was measured. Saturation, tint and a border are the free half, and the change
is bought entirely out of them.

## Decisions

- **Saturation over radius.** A wider blur would also make the frost read, and
  it is the one change that can bring back the problem the author is warning
  about. `saturate` is a colour matrix: one multiply per pixel, no kernel.
- **A border, not a rim.** `--glass-rim` was a box-shadow and TASK-023 turned
  it off on the author's instruction. Reinstating it would undo a decision they
  made. A hairline border is flat, and TASK-023's own acceptance criteria ask
  for "crisp solid borders" — so the edge comes back inside what they asked
  for, not around it.
- **68% and 72%, not one number.** Frosted glass over a light screen and
  smoked glass over a dark one do not want the same body; the existing tokens
  were already split, and the split is kept.
- **The stray brace is fixed here**, because this task is already editing that
  file and leaving a known syntax error behind to be tidied later is how it
  survived three tasks already.

## Files

- `src/app.css` — the tokens, the `.glass*` classes, the stray brace
- `src/lib/ui/Menu.svelte`, `src/lib/ui/DialogHost.svelte`,
  `src/lib/palette/Palette.svelte`, `src/lib/ui/NoticeToast.svelte`,
  `src/lib/commandlog/CommandLog.svelte` — the edge
- `src/lib/ui/glass.test.ts` (new)
- `agile/` — this triplet and the index row

## Steps

1. Tokens: saturation, tint, the new edge token, the brace.
2. The edge on each of the five panes, watching the toast's accent stripe.
3. `glass.test.ts`, run against the unfixed files first.
4. Triplet and index row.

## Risks and rollback

- **The material cannot be judged headless.** Amendment 4 holds; the numbers
  are argued from what TASK-020 and TASK-022 recorded, not seen. The sweep
  carries the judgement and says so.
- **Legibility.** A 68% tint over a 10px blur is the thinnest this material has
  been. If text over a busy backdrop reads badly, the tint is the dial — it is
  one token and it does not touch the frame budget.
- **Cost.** Saturation should be free. If the window slows, the honest first
  measurement is `saturate(100%)` against `saturate(170%)`, which isolates it
  from everything else in this change.
- Rollback is the four token values; the border is inert without them.
