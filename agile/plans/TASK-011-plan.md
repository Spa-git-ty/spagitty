<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-011 — Plan

**Item:** [`agile/items/TASK-011-secret-scanning-never-ran.md`](../items/TASK-011-secret-scanning-never-ran.md)
**Branch:** `task/TASK-011-secret-scanning`
**Status:** implemented, in `d5ca9fa`.

*Backfilled by TASK-013 from the branch, the commit and the workflow.*

## Approach

Run the scanner instead of the action.

`gitleaks/gitleaks-action@v2` refuses to start for an organization account
without a paid licence, and `Spagitty` is an organization. The gate was
therefore failing on the scanner never running, not on anything it found — the
check had been decorative since the day it was written, and no diff in this
repository's history had ever been scanned.

The binary is the same scanner with the same default rules and needs no licence:

```yaml
version=8.28.0
curl -sSfL -o gitleaks.tar.gz ".../v${version}/gitleaks_${version}_linux_x64.tar.gz"
tar -xzf gitleaks.tar.gz gitleaks
./gitleaks detect --source . --redact --verbose --exit-code 1
```

Three decisions inside that command, each of which could have gone the other
way:

- **`detect`, not `protect`.** `detect` walks history; `protect` looks at the
  working tree. The case that matters is a secret committed and then removed in
  a later commit — still sitting in the objects, still pushable, and invisible
  to a working-tree scan.
- **`--redact`.** A finding must not print the secret into a public build log,
  which would leak it a second time.
- **A pinned version.** An unpinned scanner is a gate whose behaviour changes
  without a commit.

### Why not keep the action and buy a licence

That is a purchase, an owner decision, and it buys nothing the binary does not
already do here. The action's value is its reporting integrations, none of which
this pipeline uses.

### Why the gate stays a gate

The alternative on the table for a failing security step is `continue-on-error`,
which Amendment 16 forbids: it switches the gate off while leaving it looking
green. TASK-010 answered the same pressure on the advisories half of gate 4 by
recording accepted risk **by id** in `deny.toml`. Neither half of gate 4 is
allowed to be decorative twice.

## Files

`.github/workflows/gates.yml` — gate 4's last step, with the comment explaining
why it is the binary and not the action.

## Testing

CI is the test, and it cannot be run locally, so the scanner was run locally
across the whole history first:

```
50 commits scanned.
scanned ~3090906 bytes (3.09 MB) in 360ms
no leaks found
```

That is a fact where there had been an assumption, which is what the gate was
supposed to provide and did not.

## Risk

Low, and in the direction of more failures rather than fewer: a scanner that has
never run may find something on its first real pass. It did not.

The residual risk is a false positive blocking a merge. The answer is the same
as TASK-010's — record the exception explicitly, by fingerprint, never a blanket
allow and never `continue-on-error`.

## Rollback

Revert the step. The gate returns to failing on a licence message, which is
where it started.
