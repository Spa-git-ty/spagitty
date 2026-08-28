<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-049 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

Needs a real remote you can push to — a throwaway repository on a forge, or a
bare repository somewhere on disk (`git init --bare /tmp/sweep-remote.git`),
which is enough for everything except the forge labels.

---

### SWEEP-049-01 — The list matches git

- **Priority:** P1
- **Steps:** Open Settings → Remotes on a repository with two or three remotes.
  Compare with `git remote -v`.
- **Expected:** The same remotes, the same URLs, in name order. A remote with a
  separate push URL shows it on its own line.
- **Result:**

### SWEEP-049-02 — Never fetched, and then fetched

- **Priority:** P1
- **Steps:** Add a remote. Look at its row. Fetch it. Look again.
- **Expected:** "never fetched" before, a ref count after. Not "0 refs" at any
  point.
- **Result:**

### SWEEP-049-03 — Adding is configuration only

- **Priority:** P1
- **Steps:** Add a remote and immediately check `git config --get
  remote.<name>.fetch` and `git branch -r`.
- **Expected:** The fetch refspec is there. No remote-tracking branches appeared
  — adding fetches nothing.
- **Result:**

### SWEEP-049-04 — Renaming repoints the branches

- **Priority:** P1
- **Steps:** With a branch tracking `origin/main`, rename `origin` to
  `upstream`. Check the Branches screen and `git branch -vv`.
- **Expected:** The dialog said branches would be repointed. Afterwards the
  branch tracks `upstream/main`, its divergence bar still reads, and
  `refs/remotes/origin/` is gone.
- **Result:**

### SWEEP-049-05 — Removing says what it costs, and is recoverable

- **Priority:** P1
- **Steps:** Note the ref count. Remove the remote and read the dialog first.
  Then add it back with the same name and URL, and fetch.
- **Expected:** The dialog named that count and said a fetch brings them back.
  After adding and fetching, the count is the same as before.
- **Result:**

### SWEEP-049-06 — First push sets upstream

- **Priority:** P1
- **Steps:** Create a new branch with a commit on it. Push from the toolbar.
  Then, **without touching anything else**, look at the Branches screen and run
  `git branch -vv`.
- **Expected:** The branch tracks the remote it went to. Its divergence bar
  shows a tick rather than "no upstream". A second plain push succeeds without
  asking for a remote. **This is the defect the item was opened to fix.**
- **Result:**

### SWEEP-049-07 — The form refuses what git would refuse worse

- **Priority:** P2
- **Steps:** Try to add a remote named the same as an existing one, then one
  named `up/stream`, then one with a space.
- **Expected:** Add stays disabled in all three cases. No git error appears, and
  nothing mentions a config key.
- **Result:**

### SWEEP-049-08 — Two empty states, two messages

- **Priority:** P2
- **Steps:** Open Settings → Remotes with no repository open. Then open a
  repository that has no remotes.
- **Expected:** The first says remotes belong to a repository and shows no form.
  The second says this repository has none and shows the form.
- **Result:**

### SWEEP-049-09 — Changing a URL leaves the refs alone

- **Priority:** P2
- **Steps:** Change a fetched remote's URL to another repository. Look at the
  ref count before fetching.
- **Expected:** The count is unchanged — the dialog said the refs already
  fetched stay until the next fetch.
- **Result:**

### SWEEP-049-10 — The command log shows the real invocations

- **Priority:** P3
- **Steps:** Add, rename and remove a remote. Open the command log.
- **Expected:** `remote add`, `remote rename` and `remote remove` are all there
  with their arguments, the same as every other write.
- **Result:**
