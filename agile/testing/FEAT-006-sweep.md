<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-006 — Manual sweep

Test tickets for the All repositories screen (1J).

**Fixture.** At least three repositories on disk: one clean and fully pushed,
one with uncommitted changes and a stash, and one throwaway clone that can be
moved and deleted. Keep a terminal open — most tickets are "does Spagitty agree
with git, without having opened that repository".

**The config file.** The list lives at `repositories.json` in Spagitty's
app-config directory — on Linux `~/.config/<bundle id>/repositories.json`.
Several tickets read or edit it directly. Take a copy before the sweep so the
list can be put back.

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-1J-01 — An empty list offers the action, not an empty grid

- **Priority:** P1
- **Preconditions:** `repositories.json` moved aside; Spagitty restarted.
- **Steps:** Open **All repositories** from the rail.
- **Expected:** No grid. The screen says Spagitty has not been shown a
  repository yet and that it never goes looking for one, with an **Open
  repository…** button in the middle of it. Acceptance criterion 7.
- **Result:**

### SWEEP-1J-02 — Opening adds a card

- **Priority:** P1
- **Steps:** Press **Open repository…**, pick the dirty fixture, then come back
  to this screen.
- **Expected:** A card for it, first in the list, marked as the open
  repository, with no **Open** action offered on it. The header count reads
  "1 repository", singular.
- **Result:**

### SWEEP-1J-03 — Each card agrees with git

- **Priority:** P1
- **Preconditions:** All three fixtures opened once, so all three are listed.
  Only one of them is open now.
- **Steps:** For each card that is *not* the open repository, compare against a
  terminal in that directory:
  1. Branch against `git rev-parse --abbrev-ref HEAD`.
  2. Dirty count against `git status --porcelain | wc -l`.
  3. Stash count against `git stash list | wc -l`.
  4. Ahead/behind against `git rev-list --left-right --count @{u}...HEAD`.
- **Expected:** Every figure matches, for repositories that are not the open
  one. Acceptance criterion 2.
- **Result:**

### SWEEP-1J-04 — Reading a card writes nothing

- **Priority:** P1
- **Preconditions:** A fixture that is listed but not open.
- **Steps:**
  1. `stat -c %y .git/index` in that repository, and note the time.
  2. In Spagitty, open **All repositories** and press **Refresh** three times.
  3. `stat -c %y .git/index` again.
  4. `ls .git/index.lock` — expect no such file.
- **Expected:** The index mtime is unchanged and no lock file was left behind.
  Spagitty may not modify a repository the user is not working in. Acceptance
  criterion 5.
- **Result:**

### SWEEP-1J-05 — Two groups, and idle cards read as idle

- **Priority:** P2
- **Preconditions:** One dirty fixture and one clean, fully pushed one.
- **Steps:** Read the screen.
- **Expected:** The dirty repository is under **Needs you**; the clean one is
  under **Nothing in progress** and is drawn with a dashed border. Every card
  appears under exactly one heading, and a heading with no cards is not drawn.
- **Result:**

### SWEEP-1J-06 — Chips say what is going on

- **Priority:** P2
- **Steps:** Compare the chips on the dirty card against the terminal, then
  create a merge conflict in that fixture and press **Refresh**.
- **Expected:** One chip per thing happening and none at all when nothing is.
  With a conflict present, the conflict chip leads — it is what stops work.
- **Result:**

### SWEEP-1J-07 — A moved repository is shown, not dropped

- **Priority:** P1
- **Preconditions:** The throwaway clone is listed.
- **Steps:**
  1. `mv ~/throwaway ~/throwaway-moved` in the terminal.
  2. Press **Refresh**.
- **Expected:** The card is still there, marked missing, still showing the old
  path, and offering no **Open** action. It is not silently removed — the row
  is the only clue left to where the repository went. The other cards are
  unaffected. Acceptance criterion 3.
- **Result:**

### SWEEP-1J-08 — The list survives a restart, and is capped

- **Priority:** P1
- **Steps:**
  1. Note the cards and their order.
  2. Quit Spagitty fully and start it again.
  3. Open **All repositories**.
  4. Open `repositories.json` in an editor and count the entries.
- **Expected:** The same cards, same order — most recently opened first.
  Reopening a repository already in the list moves it to the front rather than
  listing it twice. The file never holds more than 50 paths. Acceptance
  criteria 1 and 6.
- **Result:**

### SWEEP-1J-09 — Forgetting removes a row, not a directory

- **Priority:** P1
- **Steps:**
  1. Hover the **Forget** control on a card and read its tooltip.
  2. Press it.
  3. In the terminal: `ls -a <that path>`.
  4. Restart Spagitty and return to the screen.
- **Expected:** The tooltip says the directory on disk is not touched. The card
  goes. The directory and its `.git` are still there in full. The card is still
  gone after the restart. The footer states permanently that forgetting removes
  a card, not a directory. Acceptance criterion 4.
- **Result:**

### SWEEP-1J-10 — The toolbar picker reaches the screen

- **Priority:** P2
- **Steps:** From another screen, press the repository picker in the toolbar.
- **Expected:** It lands on **All repositories** — not a placeholder. Acceptance
  criterion 8.
- **Result:**

### SWEEP-1J-11 — A hand-edited list does not stop the application

- **Priority:** P1
- **Steps:** With Spagitty closed, replace `repositories.json` with `{` and start
  it. Repeat with `[1, 2, 3]` and with a line of prose.
- **Expected:** Spagitty starts every time. The screen shows the empty state
  rather than an error dialog or a crash, and opening a repository writes a
  valid list again. A convenience file the user is invited to edit may not be
  able to stop the application.
- **Result:**

### SWEEP-1J-12 — A missing config directory

- **Priority:** P3
- **Steps:** With Spagitty closed, move its whole app-config directory aside and
  start it. Open a repository.
- **Expected:** It starts on the empty state, and opening a repository recreates
  the directory and the file.
- **Result:**

### SWEEP-1J-13 — Nothing goes looking, and nothing goes out

- **Priority:** P1
- **Steps:** Read the footer. Then confirm no repository appears on the screen
  that was never opened in Spagitty — in particular, check that a git repository
  sitting beside a listed one has not been picked up.
- **Expected:** Only repositories that were opened are listed. The footer states
  that repositories are read where they sit and that nothing is uploaded
  anywhere. Non-scope, held to.
- **Result:**

### SWEEP-1J-14 — A write that fails is reported and does not lie

- **Priority:** P2
- **Steps:** Make `repositories.json` read-only (`chmod 444`), then press
  **Forget** on a card.
- **Expected:** The footer replaces its usual line with the failure. The message
  survives the reload that follows — the failure is not wiped by a successful
  re-read reporting the card is still there. Restore with `chmod 644`
  afterwards.
- **Result:**

### SWEEP-1J-15 — Many repositories stay usable

- **Priority:** P3
- **Preconditions:** 20 or more entries in the list — they may be paths that no
  longer exist.
- **Steps:** Open the screen and press **Refresh**. Watch how long the grid
  takes to fill, and scroll it.
- **Expected:** The grid fills without the window becoming unresponsive, and
  scrolling stays smooth. Each card costs a status walk; if this is slow on a
  spinning disk, note the timing on this ticket.
- **Result:**
