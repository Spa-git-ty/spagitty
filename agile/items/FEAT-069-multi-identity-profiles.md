<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-069 — Multi-identity profiles

**Status:** Backlog
**Screens:** Settings (1K), Status bar / Chrome.
**Raised by:** gap analysis in `docs/analysis/gitkraken-gap.md`.

## Problem

Developers regularly switch between personal open-source work and enterprise/work
projects requiring different author names, email addresses, GPG signing keys, and
SSH keys. Git's per-repo config requires manual setup, and committing under the wrong
identity is a frequent, painful mistake.

## Change

- **Profile storage & definition:**
  - Define identity profiles containing: Profile Name, Author Name, Author Email,
    Signing Key ID (GPG/SSH), and optional SSH command / key path.
  - Store profile sets in Spagitty user preferences.
- **Repository profile mapping & switching:**
  - Quick-switch dropdown in Settings and the window footer / status strip.
  - Ability to associate a default profile with specific repository paths or folder prefixes (e.g. `~/work/*`).
  - One-click "Apply Profile to this Repository" updating local `.git/config` (`user.name`, `user.email`, `user.signingkey`).
- **Visual identity indicator:**
  - Compact profile avatar/badge in the status strip indicating current effective committer identity.

## Non-scope

- Managing multiple GitHub/GitLab enterprise OAuth accounts simultaneously in core forge (covered in FEAT-070).
- Automatic SSH agent socket routing.

## Acceptance criteria

- Switching profiles updates the local git configuration immediately.
- The status bar reflects the active profile and warns if identity matches no known profile.
- Existing global `~/.gitconfig` is never silently overwritten without confirmation.
- `tools/record.test.ts` passes.
