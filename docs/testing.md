<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# Testing

How GitLord is checked: what runs headless, how the app is driven for a visual
sweep, and how the fixture repository the sweeps assume is built.

## Headless

```sh
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
npm run check          # svelte-kit sync && svelte-check
```

A frontend test runner and coverage measurement arrive with TASK-002; until
then `npm run check` is the only frontend gate, and coverage is unmeasured
against the Amendment 10 floor of 70%.

## The fixture repository

The manual sweeps in `agile/testing/*-sweep.md` assume a repository with a merge,
a branch that is merged and one that is not, tags of both kinds, stash entries,
a binary file, a dotfile, a deeply nested path, and a dirty working copy with
both staged and unstaged changes.

Build it in a scratch directory — **never inside this repository**:

```sh
FIX=/tmp/gitlord-fixture
mkdir -p "$FIX" && cd "$FIX"
git init -q -b main
git config user.name "Ada Lovelace"
git config user.email ada@example.com
git config commit.gpgsign false

seq 1 40 | sed 's/^/line /' > core.txt
printf 'alpha\nbeta\ngamma\n' > notes.md
printf '# fixture\n' > README.md
mkdir -p src/deep/nested
printf 'fn main() {}\n' > src/deep/nested/main.rs
printf '\x00\x01\x02binary\x00data\n' > logo.bin
printf '.cache/\n' > .gitignore
git add -A && git commit -q -m "Initial import"

for i in 1 2 3 4 5; do
  printf 'entry %s\n' "$i" >> notes.md
  git commit -q -am "Add note $i"
done

git switch -q -c feature/split-view
sed -i 's/^line 3$/LINE THREE/' core.txt
git commit -q -am "Rewrite line 3 in core"
printf 'split view work\n' > split.txt
git add split.txt && git commit -q -m "Start the split view"

git switch -q main
sed -i 's/^line 38$/LINE THIRTY-EIGHT/' core.txt
git commit -q -am "Rewrite line 38 in core"
git merge -q --no-ff feature/split-view -m "Merge feature/split-view"

git switch -q -c chore/tooling main
printf 'tooling\n' > tools.txt
git add tools.txt && git commit -q -m "Add a tooling note"

git switch -q main
git branch merged/already-in-main main~1
git tag -a v0.1.0 -m "First tag" main~2      # annotated
git tag v0.2.0                                # lightweight

printf 'work in progress\n' >> notes.md
git stash push -q -u -m "wip on notes"
printf 'second stash\n' >> README.md
git stash push -q -m "wip on readme"

printf 'uncommitted change\n' >> core.txt
printf 'brand new file\n' > untracked.txt
printf 'staged change\n' >> notes.md
git add notes.md
```

That leaves 11 commits, 4 local branches, 2 tags, 2 stash entries, one staged
file, one unstaged file and one untracked file.

### A conflicted fixture

The Conflicts screen needs a repository stopped mid-merge, which is a state the
other screens should not be tested against. Build it separately:

```sh
CFL=/tmp/gitlord-conflict
mkdir -p "$CFL" && cd "$CFL"
git init -q -b main
git config user.name "Ada Lovelace"
git config user.email ada@example.com
printf 'one\ntwo\nthree\n' > shared.txt
git add -A && git commit -q -m "Base"

git switch -q -c theirs
printf 'one\nTHEIRS\nthree\n' > shared.txt
git commit -q -am "Their change"

git switch -q main
printf 'one\nOURS\nthree\n' > shared.txt
git commit -q -am "Our change"

git merge theirs || true    # stops with a conflict, which is the point
```

## Visual sweep

The application is driven for real, not screenshotted from a mock. On Linux:

```sh
npm run tauri dev -- -- -- /tmp/gitlord-fixture
```

The trailing path is passed to the binary and read by the `launch_path`
command, so the app opens straight onto the fixture with no dialog.

Two environment variables help on some Linux desktops:

- `WEBKIT_DISABLE_DMABUF_RENDERER=1` — works around a blank webview on several
  driver and compositor combinations.
- `GDK_BACKEND=x11` — runs the window through XWayland, which is what makes
  window-level screenshot tools such as ImageMagick's `import -window` able to
  capture it on a Wayland session.

Findings go into the item's `agile/testing/<ID>-sweep.md` as filled-in results,
not into a commit message.
