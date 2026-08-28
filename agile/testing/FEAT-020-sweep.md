<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-020 — Manual sweep

Test tickets for "Show the git command behind each action".

**What this is.** A Settings toggle that reveals a Commands drawer listing every
`git` command Spagitty has executed this session — the command as spawned, its
outcome, its exit code and how long it took. The lines are recorded by the
module that spawns the process, so they are what ran, not what a screen believed
it asked for.

**What these tickets are for.** The tests prove the record is written and
rendered. What they cannot prove is that it is *true against a real repository* —
that the line in the panel is the line git actually received, that nothing a
screen does is missing from it, and that nothing appears for an operation that
never ran. Several tickets therefore ask you to compare the panel against
`git reflog`, `.git/` state, or your own terminal.

**Preconditions for everything below unless a ticket says otherwise:** Spagitty
built from `feature/FEAT-020-show-git-commands`, a scratch clone of a repository
you do not mind damaging, and a terminal open on that same clone.

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-020-01 — Off by default, and invisible

- **Priority:** P1
- **Preconditions:** A fresh config (no Spagitty settings file), repository open.
- **Steps:** Look at the toolbar. Open the command palette and type "commands".
- **Expected:** No Commands button. The palette lists "Show git commands"
  disabled, with the reason naming the Settings toggle. Acceptance criterion 1.
- **Result:**

### SWEEP-020-02 — Turning it on reveals what already happened

- **Priority:** P1
- **Steps:** With the toggle still off, fetch and check out a branch. Then go to
  Settings → Behaviour and turn on "Show the git command behind each action".
  Open the Commands drawer.
- **Expected:** The fetch and the checkout are both listed, even though they ran
  before the toggle was flipped. An empty panel here is a failure: recording
  starts with the app, not with the panel. Acceptance criterion 2.
- **Result:**

### SWEEP-020-03 — The flags are the real ones

- **Priority:** P1
- **Steps:** With the toggle on, use Fetch. Read the line in the panel.
- **Expected:** `git fetch --prune --progress --all` — not `git fetch`. Compare
  against what you would have typed: the extra flags are Spagitty's, and the
  point of this feature is that they are shown. Acceptance criterion 3.
- **Result:**

### SWEEP-020-04 — A failure shows git's own words

- **Priority:** P1
- **Steps:** Create a branch with no upstream and no remote configured, or point
  `origin` at a URL that does not exist. Push.
- **Expected:** The notice reports the failure, and the panel's row for that push
  is marked failed, shows a non-zero exit code, and carries git's stderr beneath
  it. The text matches what the same command prints in your terminal.
  Acceptance criterion 4.
- **Result:**

### SWEEP-020-05 — Credentials never appear

- **Priority:** P1
- **Steps:** Clone using an HTTPS URL with credentials embedded:
  `https://<user>:<token>@<host>/<owner>/<repo>.git`. Use a token you are willing
  to rotate afterwards. Open the panel.
- **Expected:** The clone is listed, the host and path are intact, and the
  password is `***`. Search the panel text for the token: it must not be there.
  Copy the line and paste it into a text editor — still not there.
  Acceptance criterion 5.
- **Follow-up:** Rotate the token regardless of the result.
- **Result:**

### SWEEP-020-06 — Reading history runs nothing

- **Priority:** P1
- **Steps:** Clear the panel. Then scroll the graph a long way, open several
  commits, open diffs, switch to Changes and back, run a log search.
- **Expected:** The panel stays empty, and its footer explains why: those are
  answered in-process and have no command line. A `git log` appearing here would
  be a fabrication. Acceptance criteria 6 and 7.
- **Result:**

### SWEEP-020-07 — Destructive operations are recorded exactly

- **Priority:** P1
- **Steps:** From the graph, run a hard reset onto an earlier commit. Then check
  `git reflog` in your terminal.
- **Expected:** The panel shows `git reset --hard <sha>` with the same target the
  reflog records. The mode in the line matches the menu item you chose — soft,
  mixed or hard — and not a different one.
- **Result:**

### SWEEP-020-08 — A clone is listed while it is still running

- **Priority:** P2
- **Steps:** Start a clone of a repository large enough to take several seconds.
  Open the panel *during* the clone.
- **Expected:** The clone appears immediately, marked as running rather than
  finished or failed. This is the case the panel exists for: waiting for the
  outcome would show nothing while the user is asking what is happening.
- **Result:**

### SWEEP-020-09 — Copy one, copy all

- **Priority:** P2
- **Steps:** Hover a row and use Copy. Paste into your terminal *without running
  it* and read it. Then use Copy all and paste into an editor.
- **Expected:** One line, pasteable as-is: any argument containing a space is
  quoted, so it is still one argument. Copy all gives every held command, oldest
  first, one per line. A confirmation notice appears for both.
- **Result:**

### SWEEP-020-10 — A message with spaces and quotes survives

- **Priority:** P2
- **Steps:** Commit with a subject containing spaces and a double quote — for
  example: `fix the "off by one"`.
- **Expected:** The line quotes the message as one argument and escapes the inner
  quotes. Pasting it into a terminal would produce the same commit, not several
  arguments.
- **Result:**

### SWEEP-020-11 — Clearing

- **Priority:** P2
- **Steps:** With several entries listed, press Clear. Then run one more
  operation.
- **Expected:** The list empties and explains that nothing has been run yet. The
  next operation appears on its own. Nothing that was cleared comes back on
  reopening the panel.
- **Result:**

### SWEEP-020-12 — The panel survives navigation

- **Priority:** P2
- **Steps:** Start a fetch from the Graph, then immediately navigate to Branches,
  Stash and Settings.
- **Expected:** The drawer stays open and keeps updating across all of them. An
  operation started on one screen finishes wherever the user has gone.
- **Result:**

### SWEEP-020-13 — Turning it off

- **Priority:** P2
- **Steps:** With the panel open, go to Settings and turn the toggle off.
- **Expected:** The Commands button disappears from the toolbar and the palette
  command is disabled again. Turning it back on shows the session's history
  still intact — turning the switch off stops showing the record, it does not
  destroy it.
- **Result:**

### SWEEP-020-14 — Long output does not break the layout

- **Priority:** P3
- **Steps:** Cause a failure with a long message — for instance a merge that
  conflicts across many files, or a push rejected with a multi-line hint.
- **Expected:** The stderr wraps and is selectable, the drawer scrolls rather
  than growing past the window, and the command line itself scrolls sideways
  rather than wrapping into something that would paste differently.
- **Result:**

### SWEEP-020-15 — Both themes

- **Priority:** P3
- **Steps:** With entries listed including a failure, switch through the light
  and dark variants in Settings → Appearance.
- **Expected:** The drawer follows the theme, the failed row is legible in every
  palette, and nothing in it is hard-coded to one mode.
- **Result:**

### SWEEP-020-16 — The Settings copy is true

- **Priority:** P3
- **Steps:** Read the toggle's description in Settings → Behaviour.
- **Expected:** It describes a panel listing executed commands, and it no longer
  says the feature is pending. The two remaining pending notes — signing
  (FEAT-019) and anything else not yet honoured — should still be accurate; flag
  any that are not.
- **Result:**
