<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-024 — Manual sweep

**Item:** [`agile/items/TASK-024-the-glass-reads-as-glass.md`](../items/TASK-024-the-glass-reads-as-glass.md)

**This sweep is the verification, not a formality.** The automated tests prove
the material is declared as the item says; whether it *reads* as glass, and
whether it still runs, can only be answered at the window. Amendment 4 keeps
the agent headless, so until SWEEP-001, SWEEP-002 and SWEEP-005 are filled in,
this item is built and unproven.

Every ticket wants a pane opened over **content**, not over an empty screen. A
menu over a blank window has nothing behind it and will look flat however good
the material is.

| Ticket | Preconditions | Steps | Expected result | Priority | Pass/Fail |
| --- | --- | --- | --- | --- | --- |
| SWEEP-001 | A repository open on the graph, enough commits to fill the window, light theme | 1. Open the branch menu from the top bar 2. Look at what is behind the pane 3. Look at the pane's top edge against its sides | The commit rows behind the pane are visible as a soft coloured field — not a grey one, and not hidden. The pane has a visible hairline all the way round, brighter along the top than the bottom. It reads as a pane laid over the list, not as a translucent rectangle. | High | |
| SWEEP-002 | The same, dark theme | Repeat SWEEP-001 | The same, with the pane reading as smoked rather than frosted. The top hairline is a whisper, not a drawn white line. | High | |
| SWEEP-003 | A repository open on the graph | 1. Open the branch menu over the commit list 2. Read the menu entries | Every entry is legible. If any text is hard to read against what is behind it, say which row and over what — the tint is one token and this is the dial it moves. | High | |
| SWEEP-004 | Any screen | 1. Trigger a notice toast (copy a hash, or run any action) 2. Trigger an error toast | The coloured stripe is still on the left and still green or red. The other three sides carry the glass hairline. The stripe is not overpainted. | Medium | |
| SWEEP-005 | A repository with a few thousand commits, the graph scrolling | 1. Scroll the commit list and note whether it keeps up 2. Open the command palette over it and scroll again 3. Open the command log and resize the window | Scrolling is as smooth with a pane open as without. **If the window slows here, stop and say so** — that is the failure this material was rebuilt to avoid, and TASK-022 is the record of it happening before. | High | |
| SWEEP-006 | Any screen | 1. Open the command palette 2. Open a confirmation dialog (delete a branch, then cancel) 3. Open the command log | All three carry the same material and the same edge as the menu. None of them has gained a drop shadow. | Medium | |
| SWEEP-007 | Both themes | Look at the whole window with no pane open | The chrome bars are unchanged by this task — same tint, same bottom hairline, no new blur. Anything different about them is a regression, not a feature. | Low | |
| SWEEP-008 | Any screen, a menu open | Take the window off the primary display, or change the display scale, and reopen the menu | The edge is still a hairline at the new scale — not two pixels on one side and none on the other. | Low | |

## Negative paths

- **SWEEP-003** is the one that can send this back. Thinning the tint from 82%
  to 68% is what makes the frost visible, and it is also the only thing in this
  change that can cost legibility. It is asked as a question rather than as a
  confirmation for that reason.
- **SWEEP-005** is the author's own stated constraint. It is not enough for the
  material to look right.
- **SWEEP-007** exists because the approved plan for this task was to blur the
  chrome bars and the work did not do it. The bars should look exactly as they
  did; if they do not, something was changed that nobody decided to change.
