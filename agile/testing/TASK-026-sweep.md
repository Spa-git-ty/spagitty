<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-026 — Manual sweep

**Item:** [`agile/items/TASK-026-remove-every-remaining-shadow.md`](../items/TASK-026-remove-every-remaining-shadow.md)

**SWEEP-002 is the one that matters.** The dark palette was built around shadow
density, and this task takes it away in a theme nobody has looked at since.

| Ticket | Preconditions | Steps | Expected result | Priority | Pass/Fail |
| --- | --- | --- | --- | --- | --- |
| SWEEP-001 | Light theme, a repository open | Look at the toolbar, the graph header, the nav rail, the status strip and the repository tabs | No bar casts onto what is under it. Each is separated by its border alone. Nothing looks lifted. | High | |
| SWEEP-002 | **Dark theme**, the same screen | Repeat SWEEP-001, then open a dialog, a toast and the command palette over content | Nothing casts, and nothing catches a highlight along its top edge. **Say if anything now reads as flat-in-a-bad-way** — a panel that no longer looks separate from what is behind it is the failure this change can cause, and the fix is a border, not a shadow. | High | |
| SWEEP-003 | Either theme, a repository with commits | 1. Click a commit so the detail panel shows it 2. Look at that row against the rest | The row shows a solid accent bar down its left edge. It is tellable at a glance from a row that is merely selected, which is tinted across its whole width. | High | |
| SWEEP-004 | Either theme | 1. Open the command log 2. Open a confirmation dialog and a toast | None of the three has a drop shadow. The command log is separated from the screen by its top border alone. | Medium | |
| SWEEP-005 | Either theme | 1. Tab through the toolbar, the rail and a dialog's buttons with the keyboard | **Every focused control still shows its focus ring.** This is not a shadow and must not have gone with them. | High | |
| SWEEP-006 | Either theme | 1. Hover and press a normal button 2. Hover and press a destructive one (a delete, then cancel) | Both respond with colour and border alone. No halo around the destructive one, no inset well on press. | Medium | |
| SWEEP-007 | Either theme, a repository open | 1. Look at the graph's lane band 2. Drag a splitter 3. Look at the nav rail's status indicator | The rules either side of the lane band are still drawn. The splitter highlights without glowing. The rail's indicator is a solid dot with no halo. | Medium | |
| SWEEP-008 | Either theme, All repositories | Look at the repository cards, and hover one | Cards are separated by their borders. Hovering changes colour, not height. | Low | |
| SWEEP-009 | Either theme | Look at an avatar in the commit list | The disc still has its hairline ring. It is a ring, not a shadow, and should not have gone. | Low | |

## Negative paths

- **SWEEP-002** can send this back, and the item says what the answer would be:
  a border, never a shadow returning.
- **SWEEP-005** and **SWEEP-009** exist because the instruction was "remove all
  shadows" and both of these are drawn with `box-shadow`. If either has
  disappeared, the rule was applied too widely.
