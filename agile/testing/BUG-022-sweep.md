<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-022 — Manual sweep

**Item:** [`agile/items/BUG-022-the-farm-subscribes-after-it-asks.md`](../items/BUG-022-the-farm-subscribes-after-it-asks.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-BUG022-01 | At least one agent CLI on `PATH`; Spagitty not running | 1. Start Spagitty<br>2. Open a repository<br>3. Go to the Farm screen and wait a second | The header counts the agents that are installed and **Plan it** is enabled, with no reload and nothing else pressed | P1 | |
| SWEEP-BUG022-02 | As above | 1. Open the Agents pane | Each installed agent reads as available with its version, not "Not installed" | P1 | |
| SWEEP-BUG022-03 | A machine with **no** agent CLI installed | 1. Open the Farm screen | It says nothing was detected and names what it looked for. Plan it stays disabled, which is honest rather than broken | P2 | |
| SWEEP-BUG022-04 | Any repository | 1. Open the Farm screen, switch to another screen and back several times | The agent count stays right; the farm is not re-detected on every visit | P2 | |
| SWEEP-BUG022-05 | Two repositories open in tabs, agents installed | 1. Switch between them | Each tab's farm shows its own agents; switching does not blank the count | P3 | |
