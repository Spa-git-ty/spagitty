<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-034 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

Use `/tmp/spagitty-fixture` from [`docs/testing.md`](../../docs/testing.md), which
has two stash entries. Add a third holding several files, so there is something
to walk:

```sh
cd /tmp/spagitty-fixture
printf 'more\n' >> notes.md
printf 'more\n' >> core.txt
printf 'and more\n' > src/deep/nested/extra.rs
printf '\x00\x01binary\x00\n' > blob.bin
git add -A && git stash push -q -m "wip across four files"
```

---

### SWEEP-034-01 — The files are the entry's files

- **Priority:** P1
- **Steps:** Open Stash, select the four-file entry. Compare with
  `git stash show --name-status 'stash@{0}'`.
- **Expected:** The same paths, the same statuses, in a list of their own beside
  the entries. The header count matches.
- **Result:**

### SWEEP-034-02 — Selecting a file shows that file

- **Priority:** P1
- **Steps:** Click each file in turn.
- **Expected:** The pane shows that file's hunks, and the diff matches
  `git diff 'stash@{0}^' 'stash@{0}' -- <path>`. The selected row is marked, and
  only that one.
- **Result:**

### SWEEP-034-03 — An entry opens on its first file

- **Priority:** P1
- **Steps:** Select a different entry, then come back.
- **Expected:** Each entry opens with its first file showing rather than an
  empty pane asking for a click.
- **Result:**

### SWEEP-034-04 — A one-file entry is no worse than before

- **Priority:** P1
- **Steps:** Select one of the fixture's original single-file entries.
- **Expected:** One row in the file list, its diff in the pane, no empty column
  and no wasted space. The item's own acceptance line.
- **Result:**

### SWEEP-034-05 — Keyboard

- **Priority:** P1
- **Steps:** Click a file, then press `↓`, `↑`, `End`, `Home`. Then press `j`
  and `k` on a file with several hunks. Then click into the stash message field
  along the bottom and type `jjjj`.
- **Expected:** The arrows walk the files and stop at each end. `j` / `k` move
  between hunks in the open file, as on the Diff screen. Typing in the message
  field types — it does not jump hunks.
- **Result:**

### SWEEP-034-06 — Unified and split are the same setting as the Diff screen

- **Priority:** P2
- **Steps:** Switch to split on Stash, open the Diff screen from a commit, come
  back.
- **Expected:** Both screens are in split. Switching on either changes both, and
  the choice survives a restart.
- **Result:**

### SWEEP-034-07 — The columns resize and remember

- **Priority:** P2
- **Steps:** Drag the entries/files divider and the files/diff divider, then
  quit and reopen. Double-click a divider.
- **Expected:** Each drag moves the column beside it and stops before either
  becomes useless. Widths survive the restart; the double-click resets them.
  Widening the file list here widens it on the Diff screen too — they are one
  width on purpose.
- **Result:**

### SWEEP-034-08 — A restore does not lose your place

- **Priority:** P2
- **Steps:** Select the third file of an entry, then press **Apply — keep in
  stash**.
- **Expected:** The entry stays open and so does the file you were reading, with
  the working copy updated. Pop and Drop remove the entry and the selection
  moves on, as before.
- **Result:**

### SWEEP-034-09 — Binary and over-large files

- **Priority:** P2
- **Steps:** Select `blob.bin` in the entry created above.
- **Expected:** "Binary file. There are no lines to show." — the same words the
  Diff screen uses, because it is the same component. The file row shows `bin`
  rather than `+0 −0`.
- **Result:**

### SWEEP-034-10 — Nothing here writes

- **Priority:** P1
- **Steps:** Browse an entry's files for a minute, then run `git status` and
  `git stash list`.
- **Expected:** Working copy unchanged, stash list unchanged. Browsing is a
  read; the only writes on this screen are the ones with confirmations.
- **Result:**
