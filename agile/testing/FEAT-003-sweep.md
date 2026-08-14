<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-003 — Manual sweep

Test tickets for the Working copy screen (1C).

**Fixture.** The repository built by `docs/testing.md`, plus the conflicted one
for the last tickets. **Use a fixture, never your own work**: this screen
writes to the index and creates commits.

Keep a terminal open in the same repository. Almost every ticket below is
"does GitLord agree with `git status`".

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-1C-01 — The lists match git

- **Priority:** P1
- **Preconditions:** The dirty fixture open.
- **Steps:** Compare the two columns against `git status --porcelain`.
- **Expected:** Every path git lists appears, in the right section. A staged
  modification is `M ` in git and appears under Staged; an unstaged one is ` M`
  and appears under Unstaged; `??` appears under Unstaged with a `?` glyph.
- **Result:**

### SWEEP-1C-02 — The rail and toolbar counts are different numbers on purpose

- **Priority:** P1
- **Preconditions:** A working copy with several changed files and exactly one
  staged.
- **Steps:** Read the rail's Working copy count and the toolbar's Commit button.
- **Expected:** The rail counts every distinct changed path — the same number of
  lines `git status --porcelain` prints. The button says "Commit 1 file",
  because staged is what a commit would contain. It must never offer to commit
  more files than are staged.
- **Result:**

### SWEEP-1C-03 — Staging and unstaging a whole file

- **Priority:** P1
- **Preconditions:** The dirty fixture open.
- **Steps:**
  1. Press `+` on an unstaged row.
  2. Check `git status` in the terminal.
  3. Press `−` on the same row, now under Staged.
  4. Check `git status` again.
- **Expected:** The row moves between sections and git agrees at each step.
  After step 4 the index is exactly what it was before step 1 — check with
  `git diff --cached` showing nothing for that file.
- **Result:**

### SWEEP-1C-04 — Unstaging never touches the file on disk

- **Priority:** P1
- **Preconditions:** A file with edits you would mind losing.
- **Steps:** Stage it, note its contents, unstage it, read the file again.
- **Expected:** Byte for byte identical. Nothing on this screen can discard
  work; if this ticket fails, stop and report it.
- **Result:**

### SWEEP-1C-05 — Stage all and unstage all

- **Priority:** P2
- **Preconditions:** Several files in each section.
- **Steps:** Press **Stage all**, then **Unstage all**.
- **Expected:** Everything moves, in one step each, and the index returns to
  where it started. Untracked files are staged by "Stage all" too.
- **Result:**

### SWEEP-1C-06 — Staging one hunk

- **Priority:** P1
- **Preconditions:** A file with two changes far enough apart to be two hunks.
- **Steps:**
  1. Select the file under Unstaged.
  2. Press **stage hunk** on the first hunk only.
  3. Read `git diff` and `git diff --cached` in the terminal.
  4. Read the file on disk.
- **Expected:** `git diff --cached` shows only the first change; `git diff`
  shows only the second. The file on disk still contains both. The path appears
  under **both** Staged and Unstaged.
- **Result:**

### SWEEP-1C-07 — Unstaging one hunk

- **Priority:** P1
- **Preconditions:** The state left by the previous ticket.
- **Steps:** Select the file under Staged and press **unstage hunk**.
- **Expected:** The chip says "unstage hunk", not "stage hunk". Afterwards
  `git diff --cached` is empty for that file and `git diff` shows both changes
  again.
- **Result:**

### SWEEP-1C-08 — A stale hunk is refused

- **Priority:** P1
- **Preconditions:** A file with hunks, open on the Unstaged side.
- **Steps:**
  1. In the terminal, replace the file's contents entirely.
  2. Without pressing Refresh, press **stage hunk** in GitLord.
- **Expected:** A message saying the file changed and to reload — not a partial
  stage, and not a silent success. Pressing **Refresh** afterwards shows the new
  state.
- **Result:**

### SWEEP-1C-09 — A file with no trailing newline

- **Priority:** P1
- **Preconditions:** A tracked file whose last line has no terminator, edited.
- **Steps:** Stage its last hunk, then run `git show :<path> | xxd | tail -1`.
- **Expected:** The staged blob still ends without a newline. A quietly added
  terminator is a content change nobody asked for.
- **Result:**

### SWEEP-1C-10 — Committing

- **Priority:** P1
- **Preconditions:** Something staged, something else not.
- **Steps:**
  1. Type a subject and a body.
  2. Press the commit button.
  3. Run `git log -1 --stat`.
- **Expected:** The commit contains exactly the staged files. The message has
  the subject, a blank line, then the body. The screen clears the message and
  re-reads: what was unstaged is still unstaged. The graph shows the new commit
  and the rail counts update.
- **Result:**

### SWEEP-1C-11 — An empty subject is refused

- **Priority:** P1
- **Preconditions:** Something staged, subject empty.
- **Steps:** Look at the commit button. Type only spaces and look again.
- **Expected:** Disabled in both cases. Nothing is committed and no editor
  opens.
- **Result:**

### SWEEP-1C-12 — Nothing staged

- **Priority:** P2
- **Preconditions:** Unstaged changes only, a subject typed.
- **Steps:** Look at the commit button.
- **Expected:** Disabled. A commit with nothing staged is not a commit.
- **Result:**

### SWEEP-1C-13 — Hooks run

- **Priority:** P1
- **Preconditions:** A `.git/hooks/pre-commit` that exits non-zero and prints to
  stderr, made executable.
- **Steps:** Stage something, write a subject, press commit.
- **Expected:** The commit does not happen, `git log` is unchanged, and the
  hook's own message is shown in the footer. The message you typed is still in
  the box — retyping it is the wrong punishment for a hook saying no.
- **Result:**

### SWEEP-1C-14 — Amending

- **Priority:** P2
- **Preconditions:** A clean working copy with at least two commits.
- **Steps:**
  1. Turn on **amend the previous commit**.
  2. Read the message boxes.
  3. Change the subject and press the button.
  4. Run `git log --oneline`.
- **Expected:** The previous message is offered when the boxes are empty, and
  never overwrites something already typed. The commit count is unchanged and
  the subject is the new one. The screen says plainly that this rewrites the
  last commit.
- **Result:**

### SWEEP-1C-15 — A clean working copy

- **Priority:** P2
- **Preconditions:** Nothing to commit.
- **Steps:** Open the screen.
- **Expected:** It says the working copy matches the last commit. No empty
  columns, no disabled buttons floating in space. The rail's Working copy count
  is `0`, not `·`.
- **Result:**

### SWEEP-1C-16 — Conflicts block committing

- **Priority:** P1
- **Preconditions:** The conflicted fixture.
- **Steps:** Open the screen with a merge in progress.
- **Expected:** A Conflicts section listing the conflicted paths, with no stage
  button on those rows. The commit button is disabled and the footer says to
  resolve the conflicts first. The rail's Conflicts count matches.
- **Result:**

### SWEEP-1C-17 — Outside changes are noticed

- **Priority:** P2
- **Preconditions:** The screen open.
- **Steps:** In the terminal, edit a tracked file and `git add` another.
- **Expected:** The lists update within about a second without pressing
  anything, and the selection stays on the file you were reading if it still
  exists.
- **Result:**

### SWEEP-1C-18 — Special files say what they are

- **Priority:** P2
- **Preconditions:** An edited binary file and, if you can make one, a file over
  8MB.
- **Steps:** Select each.
- **Expected:** The binary one says it has no hunks to stage individually and
  offers no hunk chip — but the whole file can still be staged from its row. The
  over-large one says it is too large to diff.
- **Result:**

### SWEEP-1C-19 — Both themes

- **Priority:** P2
- **Steps:** Toggle the theme with rows in every state on screen.
- **Expected:** Solid and dashed rows are still tellable apart, the selected row
  is still obviously selected, and the added and removed tints in the hunk pane
  are still distinguishable.
- **Result:**

### SWEEP-1C-20 — A repository with no commits

- **Priority:** P2
- **Preconditions:** `git init` in an empty directory, one file created.
- **Steps:** Open it, stage the file, unstage it, then stage and commit.
- **Expected:** Staging works, unstaging removes the entry and leaves the file
  on disk, and the first commit succeeds. Nothing anywhere claims there is a
  previous commit to amend.
- **Result:**
