<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-011 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-011-01 — An HTTPS request completes instead of aborting

- **Priority:** P1
- **Steps:** Start Spagitty with the update check on, and watch the terminal it
  was started from. Then Settings → Behaviour → Updates → **Check now**.
- **Expected:** The window opens. No panic, and in particular no
  `uri scheme is https, provider is Rustls but feature is not enabled`. The
  check reports a release tag.
- **Result:**

### SWEEP-011-02 — And the same on the other network path

- **Priority:** P1
- **Steps:** Connect an account, then open Pull requests.
- **Expected:** It lists pull requests. The process is still alive afterwards —
  this is the path `v0.1.0-preview.1` aborts on.
- **Result:**

### SWEEP-011-03 — On a packaged build, not just a dev one

- **Priority:** P1
- **Steps:** Repeat both against the AppImage and the Windows build from a
  release, not `npm run tauri dev`.
- **Expected:** The same. The feature set is the same in both, but this is the
  build people actually run, and it is the one that shipped broken.
- **Result:**
