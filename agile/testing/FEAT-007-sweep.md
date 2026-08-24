<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-007 — Manual sweep

Test tickets for the Log search screen (1I).

**Fixture.** Two repositories: the one from `docs/testing.md`, and a large one —
a clone of something with tens of thousands of commits — for the streaming and
performance tickets. Keep a terminal open in each; most tickets are "does
Spagitty agree with `git log`".

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-1I-01 — An author search matches git

- **Priority:** P1
- **Steps:** Type a name into **author** and press Search. Compare against
  `git log --branches --remotes HEAD -i --author=<name> --format=%H`.
- **Expected:** The same commits. Use `--branches --remotes HEAD` and not
  `--all` — `--all` includes the stash, and Spagitty does not search stashes.
  Acceptance criterion 1.
- **Result:**

### SWEEP-1I-02 — A message search matches git

- **Priority:** P1
- **Steps:** Search a word you know appears in a commit body, not only a
  subject. Compare against
  `git log --branches --remotes HEAD -i --fixed-strings --grep=<word>`.
- **Expected:** The same commits, including ones where the word is only in the
  body.
- **Result:**

### SWEEP-1I-03 — A path search matches git, including across merges

- **Priority:** P1
- **Preconditions:** A path that was changed on a branch and then merged.
- **Steps:** Search that path. Compare against
  `git log --branches --remotes HEAD -- <path>`.
- **Expected:** The same commits, and in particular the **merge commit is
  absent** where git omits it — git simplifies away a merge that is TREESAME to
  one of its parents, and so does Spagitty. A list that includes extra merges is
  a failure of this ticket, not a nicety.
- **Result:**

### SWEEP-1I-04 — A date range matches git

- **Priority:** P2
- **Steps:** Put a date in **since** and another in **until**, both
  `YYYY-MM-DD`. Compare against `git log --since=<a> --until=<b>`.
- **Expected:** The same commits. `until` covers the whole of its day, so a
  commit made at 23:00 on the until date is included.
- **Result:**

### SWEEP-1I-05 — Filters compose, and the chips say what is applied

- **Priority:** P1
- **Steps:** Apply an author, then add a path, then add a message. Watch the
  count after each. Then press the × on one chip.
- **Expected:** Each addition can only shrink the result, never grow it. One
  chip per filter, reading `author:…`, `path:…`, `message:…`, `since:…`,
  `until:…`, and each chip matches the box above it exactly. Removing a chip
  clears its box and re-runs; removing the last one empties the results rather
  than searching for nothing. Acceptance criterion 2.
- **Result:**

### SWEEP-1I-06 — Results stream, and a superseded query never appears

- **Priority:** P1
- **Preconditions:** The large repository.
- **Steps:**
  1. Search something broad — a single common letter in **message**.
  2. Watch the header count while it runs.
  3. Before it finishes, change the query and press Search again.
- **Expected:** Results appear and the count climbs while the walk is still
  running — the screen does not sit blank until the end. After the second
  search, **no row from the first one is ever visible**, and the count restarts
  from zero rather than continuing upward. Acceptance criterion 3.
- **Result:**

### SWEEP-1I-07 — An empty result says which filter is narrowest

- **Priority:** P2
- **Steps:** Search for a path that exists together with a message that does
  not, so nothing matches.
- **Expected:** "Nothing matched, and `path:…` is the narrowest filter applied."
  The filter it names is the one the *search* used — editing a box afterwards
  without pressing Search does not change the message. Acceptance criterion 4.
- **Result:**

### SWEEP-1I-08 — Opening a result, and opening its diff

- **Priority:** P1
- **Steps:** Click a result. Then alt-click another. Then use `↵` and `⌥↵` on a
  focused row.
- **Expected:** A plain click or `↵` opens the commit in the right-hand column —
  message, author, and the files it touched. Alt-click or `⌥↵` leaves for the
  Diff screen on that commit. This is exactly what the footer says. Acceptance
  criterion 8.
- **Result:**

### SWEEP-1I-09 — `⌘F` from anywhere

- **Priority:** P1
- **Steps:** From the Graph screen press `⌘F` (`Ctrl+F` where there is no
  command key). Repeat from Branches and from Conflicts.
- **Expected:** Log search opens every time, with the cursor already in the
  **author** field so typing starts a query immediately. The rail's Log entry
  shows the `⌘F` hint. Acceptance criterion 7.
- **Result:**

### SWEEP-1I-10 — Blame matches git, line for line

- **Priority:** P1
- **Steps:** Blame a file that has been changed by more than one commit. Compare
  against `git blame <path>` in the terminal, line by line.
- **Expected:** Every line attributed to the same commit git attributes it to,
  with the same author. Lines from one commit are grouped into one block, which
  is how a blame is read. Acceptance criterion 5.
- **Result:**

### SWEEP-1I-11 — Blame across a merge

- **Priority:** P1
- **Preconditions:** A file whose history contains a merge *and* a commit that
  left the file alone — the shape that made the in-process implementation
  unusable.
- **Steps:** Blame it at HEAD.
- **Expected:** A complete blame, no crash, no missing lines, matching
  `git blame`. This ticket exists because the first implementation failed
  exactly here.
- **Result:**

### SWEEP-1I-12 — Blame refuses honestly

- **Priority:** P1
- **Steps:** Blame, in turn: a binary file, a path that does not exist, a
  directory, and an empty file.
- **Expected:** Each says which — binary with its size, "no such file at that
  revision", a directory reading as not-a-file, and an empty file saying it has
  no lines. **None of them shows an empty list**, which would read as a file
  nobody has ever touched. Acceptance criterion 6.
- **Result:**

### SWEEP-1I-13 — Blame at an older revision

- **Priority:** P2
- **Steps:** Blame a file with `v0.1.0` (or another annotated tag) in the **at**
  box, then with a short SHA, then with a branch name.
- **Expected:** All three work, and the header shows the resolved commit. An
  annotated tag resolves to the commit it points at rather than failing. A
  revision that does not exist gives git's own message rather than an empty
  strip.
- **Result:**

### SWEEP-1I-14 — Blame across a rename

- **Priority:** P2
- **Preconditions:** A file renamed at some point in its history.
- **Steps:** Blame it at HEAD.
- **Expected:** Lines older than the rename say what the file used to be called
  ("was …"). Lines added since do not.
- **Result:**

### SWEEP-1I-15 — Nothing is written

- **Priority:** P1
- **Steps:** `stat -c %y .git/index` and `git status --porcelain` before; run
  several searches and several blames; check both again, plus `ls .git/index.lock`.
- **Expected:** No change to the index, no lock file, no change to the status.
  Searching and blaming are reads.
- **Result:**

### SWEEP-1I-16 — Leaving and coming back

- **Priority:** P3
- **Steps:** Run a broad search on the large repository, then navigate away
  while it is still running, then come back.
- **Expected:** Leaving does not freeze the application, and the screen comes
  back empty and ready rather than half-populated with a walk nobody is watching.
- **Result:**

### SWEEP-1I-17 — A query on an empty repository

- **Priority:** P3
- **Preconditions:** A repository with no commits.
- **Steps:** Search anything.
- **Expected:** A stated message, not a crash and not a silent empty list.
- **Result:**
