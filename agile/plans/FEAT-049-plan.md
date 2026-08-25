<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-049 — Plan

**Item:** [`agile/items/FEAT-049-remotes-management.md`](../items/FEAT-049-remotes-management.md)
**Branch:** `feature/FEAT-049-remotes`
**Status:** implemented.

**Branch point.** Cut from `feature/FEAT-016-conflict-writes`, continuing the
unmerged stack.

## Approach

### The `-u` defect first

The gap analysis asked a question rather than reporting a bug: *verify — does
push use `-u`? If not, first push leaves the branch unmapped.* It did not.

The consequence chains further than it looks. A branch pushed for the first time
got its commits to the remote and tracked nothing afterwards, so the Branches
screen showed no upstream, FEAT-047's divergence bar had nothing to compare
against and drew the no-upstream state, and the user's next plain `push` or
`pull` failed with a message about upstreams that reads as though something is
broken. One missing flag, three symptoms in three places.

`--set-upstream` is now passed whenever a remote is named. It is safe to pass
unconditionally: git does nothing when the upstream is already what it would
set, so an existing branch is unaffected.

### Reading is `gix`, writing is `git`

The usual split, and here it has teeth. A remote is not two lines of config:

- `remote add` writes the **fetch refspec**. Without it a remote looks
  configured and fetches nothing.
- `remote rename` moves the refs under `refs/remotes/` **and** rewrites the
  upstream of every branch that tracked the old name.
- `remote remove` takes those refs with it.

Writing the config ourselves would leave a repository that looked right and
behaved wrongly, which is the worst of the available outcomes.

### The ref count is the interesting column

Every remote shows how many refs it has under `refs/remotes/<name>/`. Zero means
it has never been fetched. That is the only visible difference between a remote
somebody added a moment ago and one whose URL stopped working months ago — a
distinction that is otherwise invisible until a push fails, and the reason the
list says "never fetched" rather than "0 refs".

### It lives in Settings

Not a rail screen. This is configuration people touch once and then not again
for months, and the rail is for the places work happens. It is the only section
in Settings about the *open repository* rather than about Spagitty, which is why
it says so when there is none — and why "no repository is open" and "this
repository has no remotes" are two different messages with two different
responses. The second one offers the form; the first cannot.

### What the store refuses

A name that is already taken, and a name with a slash or a space in it, are
refused before git sees them. Not because git would accept them, but because
git's message for each names a config key rather than the remote, and a form
that says "that name is taken" beats one that reports
`remote.origin.url already exists`.

### The wording

Removing sounds worse than it is; renaming sounds milder. So the confirmations
lean against both: remove counts the refs and says a fetch brings them back,
rename says every branch tracking it is repointed.

## What was not done

- **`git push --delete`** for removing a remote branch. It belongs with
  FEAT-018's remaining work.
- **Editing the fetch refspec**, and `pushurl` as anything but a read. Both are
  rare enough that a text field for them would be a text field nobody uses and
  everybody has to scroll past.
- **A remote's own screen**, with its branches. That is closer to FEAT-017.
