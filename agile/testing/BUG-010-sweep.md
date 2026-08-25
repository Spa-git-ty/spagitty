<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-010 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-010-01 — The Windows build gets past the frontend

- **Priority:** P1
- **Steps:** Push a `draft/**` branch and let the draft-release workflow run, or
  run `npm run tauri build` on a Windows machine.
- **Expected:** `npm run build` completes. No `"notice" is not exported by`
  and no `"dialog" is not exported by`.
- **Result:**

### SWEEP-010-02 — The toast and the dialogs still work

- **Priority:** P1
- **Steps:** Cause a failure — fetch with no remote configured — and then a
  success. Then trigger anything with a confirmation, such as deleting a branch.
- **Expected:** The toast appears bottom-right with git's own message and can be
  dismissed. The confirmation opens, and both buttons answer it. The rename was
  meant to change nothing anyone can see.
- **Result:**

### SWEEP-010-03 — The guard actually guards

- **Priority:** P2
- **Steps:** `touch src/lib/ui/Panels.svelte` beside `src/lib/panels.svelte.ts`
  — or any pair with the same stem in one directory — and run `npm test`.
- **Expected:** `tools/case.test.ts` fails and names the file. Delete it again.
- **Result:**
