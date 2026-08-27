<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-054 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-054-01 — It finds the latest release

- **Priority:** P1
- **Steps:** Settings → Behaviour → Updates → **Check now**.
- **Expected:** It names the project's newest release tag, matching the releases
  page. A locally built Spagitty says it is a development build and does **not**
  claim to be out of date.
- **Result:**

### SWEEP-054-02 — Off means no request

- **Priority:** P1
- **Steps:** Turn the toggle off, quit, and start Spagitty again with a proxy
  watching — `mitmproxy`, or `tcpdump port 443`.
- **Expected:** **No request at all** at startup. The preference is read before
  anything is asked, so off is not a discarded answer. Pressing **Check now**
  still works, because that is somebody asking.
- **Result:**

### SWEEP-054-03 — On means one request, once

- **Priority:** P1
- **Steps:** Turn it on, restart with the proxy watching, and leave the
  application open for ten minutes.
- **Expected:** Exactly one request at startup, to the project's releases
  endpoint, and none after. No token, no identifier, nothing about the machine
  or the repositories.
- **Result:**

### SWEEP-054-04 — A failure does not get in the way

- **Priority:** P1
- **Steps:** Disconnect the network and start Spagitty. Then open Settings and
  press **Check now**.
- **Expected:** The application starts normally with no error toast and no
  delay. The Settings screen reports the failure when asked, and the identity
  fields on the same screen are still editable.
- **Result:**

### SWEEP-054-05 — A released build knows which one it is

- **Priority:** P1
- **Steps:** Download an AppImage from a release, run it, and check.
- **Expected:** It names its own tag under "This build", and says it is up to
  date. Download the *previous* release and check again: it should say the
  newer one has been released. This is the check that `SPAGITTY_RELEASE` is
  actually baked in — a build that says "development" here means it is not.
- **Result:**

### SWEEP-054-06 — The link is a link, and nothing is installed

- **Priority:** P2
- **Steps:** With an out-of-date build, press **Copy link** and paste it.
- **Expected:** The releases URL for the newer tag. Nothing downloaded, nothing
  installed, no browser opened by the application, and the running binary
  untouched.
- **Result:**
