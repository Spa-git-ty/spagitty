<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-051 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

Use a repository with several tags, at least one annotated and one lightweight.
`git tag -a v0.1.0 -m "First"` and `git tag v0.2.0` are enough.

---

### SWEEP-051-01 — The list matches git

- **Priority:** P1
- **Steps:** Open Tags. Compare with `git tag -l` and
  `git for-each-ref refs/tags --format='%(refname:short) %(objecttype)'`.
- **Expected:** The same tags. Every one git calls a `tag` object is marked
  annotated here, and every one it calls a `commit` is marked lightweight.
- **Result:**

### SWEEP-051-02 — Annotated and lightweight look different

- **Priority:** P1
- **Steps:** Look at one of each without reading the labels.
- **Expected:** The annotated row shows its message; the lightweight row shows
  the tagged commit's subject and is drawn dashed. **edit message** is a live
  chip on the first and an inert label on the second, and hovering the label
  says why.
- **Result:**

### SWEEP-051-03 — Creating both kinds

- **Priority:** P1
- **Steps:** Create a tag with a message, then one without. Check both with
  `git cat-file -t`.
- **Expected:** The first is a `tag` object, the second a `commit`. Both appear
  in the list immediately with the right marking.
- **Result:**

### SWEEP-051-04 — Tagging somewhere other than HEAD

- **Priority:** P1
- **Steps:** Create a tag with `HEAD~3` in the *at* field. Check where it landed.
- **Expected:** It points at that commit, and the row's short id matches
  `git rev-parse --short HEAD~3`.
- **Result:**

### SWEEP-051-05 — Rewriting a message keeps the commit

- **Priority:** P1
- **Steps:** Note an annotated tag's short id. Use **edit message**, read the
  dialog, change the text, confirm. Check the id again and `git show` the tag.
- **Expected:** The dialog said it deletes and recreates, and that the date and
  tagger move. Afterwards the message is the new one, the commit is the same
  one, and the tag is still annotated.
- **Result:**

### SWEEP-051-06 — An empty message does not eat the tag

- **Priority:** P1
- **Steps:** Use **edit message**, clear the field entirely, and try to confirm.
- **Expected:** Nothing happens and **the tag is still there**. This operation
  deletes before it creates, so this is the test that matters most on this page.
- **Result:**

### SWEEP-051-07 — Deleting says what it does not reach

- **Priority:** P2
- **Steps:** Read the delete dialog for a tag that exists on a remote, then
  delete it and fetch.
- **Expected:** The dialog said the remote keeps it and a fetch can bring it
  back. After fetching, it does — and that is not a bug.
- **Result:**

### SWEEP-051-08 — Checking out a tag

- **Priority:** P2
- **Steps:** Check out a tag, look at the graph and the toolbar, then check out
  a branch again.
- **Expected:** Detached at that commit, said somewhere visible, and a branch
  checkout puts everything back exactly as the dialog promised.
- **Result:**

### SWEEP-051-09 — The rail count goes somewhere

- **Priority:** P2
- **Steps:** Look at the Tags entry in the rail.
- **Expected:** The count matches the list's own count, and clicking it opens
  this screen. It counted tags and went nowhere before this item.
- **Result:**

### SWEEP-051-10 — Ordering, including the surprising case

- **Priority:** P3
- **Steps:** Make a lightweight tag on a commit from months ago. Look at where
  it lands.
- **Expected:** Near the bottom, dated by that commit — the footer says a
  lightweight tag is dated by the commit it points at. Surprising once, and
  explained on the screen.
- **Result:**
