<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-011 — Secret scanning has never run

**Status:** Done on `task/TASK-011-secret-scanning`.
**Found by:** PR #4, the first pull request whose pipeline reached gate 4.

## Problem

Gate 4's last step fails, and has always failed, on this:

```
[GitLumiere] is an organization. License key is required.
🛑 missing gitleaks license. Go grab one at gitleaks.io and store it as a
   GitHub Secret named GITLEAKS_LICENSE.
```

`gitleaks/gitleaks-action@v2` requires a **paid licence for organization
accounts**. `GitLumiere` is an organization, so the action refuses to start.

**The gate was not failing on a finding. It was failing on the scanner never
running.** No diff in this repository's history has ever been scanned for
secrets — the check has been decorative since the day it was written.

It went unnoticed for the same reason TASK-010's advisories did: gate 3 failed
on every build, and Amendment 16 halts the pipeline at the first red gate, so
gate 4 was unreachable until TASK-005 fixed gate 3.

## Fix

Run `gitleaks` itself instead of the action. Same scanner, same default rules,
no licence:

```yaml
- name: Secrets in the diff
  run: |
    version=8.28.0
    curl -sSfL -o gitleaks.tar.gz "https://github.com/gitleaks/gitleaks/releases/download/v${version}/gitleaks_${version}_linux_x64.tar.gz"
    tar -xzf gitleaks.tar.gz gitleaks
    ./gitleaks detect --source . --redact --verbose --exit-code 1
```

`detect` walks history rather than the working tree, which is what catches a
secret that was committed and then removed in a later commit — the case a
working-tree scan misses entirely and the one that actually matters, because the
secret is still in the objects.

`--redact` so a finding does not print the secret into a public build log, which
would leak it a second time.

The version is pinned. An unpinned scanner is a gate whose behaviour changes
without a commit.

## What the first real run found

Nothing:

```
50 commits scanned.
scanned ~3090906 bytes (3.09 MB) in 360ms
no leaks found
```

That is the reassuring answer, and it is worth having as a *fact* rather than an
assumption — which is exactly what the gate was supposed to provide and did not.

## Acceptance criteria

- Gate 4 runs the scanner and reports what it finds.
- A committed secret fails the gate.
- No licence, no secret, and no account tier is required.
- A finding is redacted in the log.

## Dependencies

TASK-005, without which gate 4 was unreachable. TASK-010, which fixed the other
half of the same gate.
