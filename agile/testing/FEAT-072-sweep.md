<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-072 — Manual sweep

**Item:** [`agile/items/FEAT-072-delight-layer.md`](../items/FEAT-072-delight-layer.md)

Run against the fixture repository in `docs/testing.md`. The sound tickets need
a machine with working audio; skip them and say so rather than passing them
untested.

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT072-01 | Fixture open, Personality = Balanced | 1. Stage one file<br>2. Commit it | After a short pause, a card appears in the middle of the window, holds, and leaves on its own. Nothing had to be clicked. | P1 | Pass |
| SWEEP-FEAT072-02 | As above | 1. Commit<br>2. While the card is up, click a commit row behind it and type into the message box | The click and the keystrokes reach the screen underneath. The card never takes focus. | P1 | Pass |
| SWEEP-FEAT072-03 | Fixture open | 1. Go to Badges (1P) | Earned badges first, locked ones dashed, secrets as `???`. The header reads `n / m+?`. | P1 | Pass |
| SWEEP-FEAT072-04 | A badge earned | 1. On Badges, click an earned badge | It is equipped as the title and marked. Clicking `none` takes it off. | P1 | Pass |
| SWEEP-FEAT072-05 | A badge earned | 1. Press **Copy card**<br>2. Paste into a terminal | The box is a rectangle — every line the same width, borders aligned. | P1 | Pass |
| SWEEP-FEAT072-06 | A shame badge earned | 1. Press **Copy markdown**<br>2. Read it | No Hall of Shame badge appears in the markdown. | P1 | Pass |
| SWEEP-FEAT072-07 | Settings → Personality | 1. Choose **Professional**<br>2. Commit | No card. A line in the corner instead. The badge is on the Badges screen. | P1 | Pass |
| SWEEP-FEAT072-08 | Personality = Professional | 1. Open Badges | No Hall of Shame section. | P2 | Pass |
| SWEEP-FEAT072-09 | Personality = Professional | 1. Open Settings → Personality | The sound levels above **Off** are disabled, and say why. | P2 | Pass |
| SWEEP-FEAT072-10 | Audio available | 1. Personality = Balanced<br>2. Sound = Subtle | The commit sound plays once, at that level, as it is selected. | P2 | Pass |
| SWEEP-FEAT072-11 | Audio available, Sound = Full | 1. Commit<br>2. Merge a branch<br>3. Finish a rebase | Three distinguishable sounds. | P2 | Pass |
| SWEEP-FEAT072-12 | Sound = Off | 1. Commit, merge, earn a badge | Silence. | P1 | Pass |
| SWEEP-FEAT072-13 | Fixture with a conflict | 1. Merge the conflicting branch<br>2. Resolve every file<br>3. Continue | Conflict Rookie is earned, and the counts on Badges say how many files. | P1 | Pass |
| SWEEP-FEAT072-14 | Fixture open | 1. Reflog (1M)<br>2. Branch at an old entry | A secret badge — Reflog Wizard — arrives. It was `???` before. | P1 | Pass |
| SWEEP-FEAT072-15 | Two repositories open | 1. Earn a badge in one<br>2. Switch tabs to the other<br>3. Open Badges | The second repository's record is its own and is empty. | P1 | Pass |
| SWEEP-FEAT072-16 | A repository with agent co-authored commits | 1. Commit with a `Co-authored-by: Claude …` trailer<br>2. Open Badges | The agent appears as a second actor, with the commit against it and not against you. | P1 | Pass |
| SWEEP-FEAT072-17 | Any state | 1. Badges → **Forget this record**<br>2. Confirm | Everything is cleared. `git log` is untouched. | P1 | Pass |
| SWEEP-FEAT072-18 | OS set to reduce motion | 1. Commit | The card appears and leaves without travelling or scaling. | P2 | Pass |
| SWEEP-FEAT072-19 | Any state | 1. `Ctrl+P`, type `gtb` | **Go to Badges** is the first result. | P2 | Pass |
| SWEEP-FEAT072-21 | Fixture open | 1. Settings → God mode<br>2. Click any badge in **Preview a reward moment** | The card appears, with its sound. Nothing is added to the record — the count above does not move. | P1 | Pass |
| SWEEP-FEAT072-22 | Settings → God mode | 1. Click **A rebase that fought back** | Rebase Survivor arrives through the real rules. | P1 | Pass |
| SWEEP-FEAT072-23 | Settings → God mode | 1. Click **Grant every badge**<br>2. Open Badges | Every slot is filled, including the secrets, and Pasta Master is among them. | P1 | Pass |
| SWEEP-FEAT072-24 | Settings → God mode | 1. Click **Seed three agents**<br>2. Open Badges | Claude, GPT and Codex appear as actors with a standings table between them. | P1 | Pass |
| SWEEP-FEAT072-25 | God mode, sound not Off | 1. Play each of the ten cues | Ten distinguishable sounds; the five rarities are clearly different from each other. | P2 | Pass |
| SWEEP-FEAT072-27 | God mode, sound not Off | 1. Play any cue<br>2. Read the line under the cues | It names the device state. On a Linux host with no `gst-plugins-good`, the sounds are silent and this line is the only thing that says why. | P1 | Pass |
| SWEEP-FEAT072-33 | Any dark theme | 1. Settings → External Tools | Both pickers are dark wells with a themed chevron, not white platform widgets. The selected text is readable. | P1 | Pass |
| SWEEP-FEAT072-34 | Any theme | 1. Open the worktree modal and the create-pull-request modal | Their pickers match the External Tools ones — the fix is in `app.css`, so every select in the application moved together. | P1 | Pass |
| SWEEP-FEAT072-35 | Any theme | 1. Hover a picker<br>2. Focus it with the keyboard | The chevron survives both. A `background` shorthand on either state would erase it. | P2 | Pass |
| SWEEP-FEAT072-29 | Any state | 1. Settings → External Tools<br>2. Switch between a light and a dark theme | The cards, the select and the tool pills follow the theme. Nothing stays dark on a light theme. | P1 | Pass |
| SWEEP-FEAT072-30 | Rail expanded | 1. Look at **Open repository…** | The icon and the label sit together at the left, not at opposite ends of the rail. Collapsed, the icon is centred. | P1 | Pass |
| SWEEP-FEAT072-31 | Any state | 1. Settings — press every chip in turn | Each one shows its own section. None of them shows License. | P1 | Pass |
| SWEEP-FEAT072-32 | Sound not Off | 1. Commit<br>2. Merge a branch<br>3. Recover from the reflog | The commit is a short rise, the merge is two lines converging into one snap, the recovery is a mechanical latch. Three clearly different things. | P2 | Pass |
| SWEEP-FEAT072-28 | Spagitty freshly started, sound = Full | 1. Click one sound, once | It is audible **the first time**, not from the second click onwards — the autoplay resume must not eat the first cue. | P1 | Pass |
| SWEEP-FEAT072-26 | No repository open | 1. Settings → God mode | The warning line is shown, previews and sounds still work, everything that writes is disabled. | P2 | Pass |
| SWEEP-FEAT072-20 | Settings file hand-edited to `"personality": "loud"` | 1. Start Spagitty<br>2. Open Settings | Personality reads Balanced. Every other setting is as it was left. | P1 | Pass |
