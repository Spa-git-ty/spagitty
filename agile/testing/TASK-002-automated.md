<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-002 — Automated tests

This item's deliverable *is* the tests, so this document records what was
written, what each group asserts, and the coverage the result measures.

## Run result

```
cargo test --workspace     81 passed, 0 failed   (70 core, 11 tauri)
npm test                  302 passed, 0 failed   (19 files)
cargo fmt --all --check    clean
cargo clippy --workspace --all-targets -- -D warnings   clean
npm run check              8 ERRORS  <- see BUG-001
```

**Correction.** This document originally recorded `npm run check` as clean. It
was not: the gate was run at the start of the session, before these test files
existed, and never run again before the commit. Eight type errors shipped in
the test files this item added. Recorded as **BUG-001** and fixed in FEAT-003.
`SWEEP-T002-04` fails on this commit, and passes from FEAT-003 onward.

## Coverage against the Amendment 10 floor of 70%

| Tree | Statements / Regions | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Frontend (`src/lib/**`) | 98.13% | 85.87% | 98.37% | 99.16% |
| Rust workspace | 83.81% | — | 72.03% | 82.39% |

Both clear the floor. `cargo llvm-cov` reports no branch data on this
toolchain, which is why that column is empty; the Rust figure is regions and
lines.

**Scope.** Rust excludes `crates/gitlumiere-core/src/fixture.rs`: it is test
scaffolding, and counting a helper every test exercises would lift the number
without any product code being tested. The frontend counts `src/lib/**` only —
`src/testing/**` is scaffolding for the same reason, and `src/routes/**` holds
the screens' shells whose logic lives in `src/lib`.

The floor is enforced, not merely reported: `--fail-under-lines 70` for Rust,
and `test.coverage.thresholds` in `vite.config.ts` for the frontend, so
`npm run coverage` fails locally for the same reason CI would.

## Frontend

| File | Unit | What the tests assert |
| --- | --- | --- |
| `format.test.ts` | `src/lib/format.ts` | Relative-time boundaries at 45s, 90s, an hour, a day; singular and plural forms; a commit dated in the future reads as "now" rather than a negative interval; a landmark is the first row of its day and is not created by rows being out of order; the status glyphs, including that `deleted` is a real minus sign |
| `nav.test.ts` | `src/lib/nav.ts` | The graph matches only the root path — a naive `startsWith` would light it up on every screen; a child route matches, a sibling sharing a prefix does not; codes and hrefs are unique; no item asks for both a count and a hint, since the rail draws one value |
| `metrics.test.ts` | `src/lib/metrics.ts` | Lane columns clamp at both ends; the column is the design's 150px at five lanes and widens by one pitch per column; row centres derive from the index with no accumulated drift; a lane past the drawn columns clamps to the last one; colours cycle; `applyMetrics` publishes every value with a unit |
| `api.test.ts` | `src/lib/api.ts` | Every command's name and argument keys, since `invoke` takes a string and a rename on either side is silent at compile time; results and rejections pass through untouched; `inTauri` in and out of the webview |
| `version.test.ts` | `src/lib/version.ts` | The SPDX identifier, the abbreviation being a prefix of it, a semantic version, and that the commit fallback is visibly `unknown` — a plausible-looking wrong SHA would point at source that does not correspond to the build |
| `theme.test.ts` | `src/lib/theme.svelte.ts` | The choice lands on the root element; a stored choice beats the OS preference; a stored value that is not a theme is ignored; unreadable storage and a missing `matchMedia` both degrade rather than throw |
| `panels.test.ts` | `src/lib/panels.svelte.ts` | Clamping at both ends, rounding to whole pixels, publishing the clamped value; storage written once on commit rather than per pixel; stored widths are clamped so a hand-edited file cannot break the layout; partial, wrongly-typed and corrupt records all fall back |
| `repo.test.ts` | `src/lib/repo.svelte.ts` | Open takes info, counts and token and bumps the generation; a failed open leaves nothing half-open and does not bump it; the dialog's cancel and multi-select results; refresh keeps the commit count, which only the walk knows; a failed refresh keeps the repository |
| `graph/lanes.test.ts` | `src/lib/graph/lanes.ts` | The visible range covers every row the viewport shows and never runs past either end; lanes that appear only as edges are counted, and the count reaches one row past the fold; drawing clears first, uses a straight segment for a lane that stays put and a cubic elbow for one that moves, draws nodes after the edges that reach them, and skips nodes scrolled out of the canvas |
| `graph/store.test.ts` | `src/lib/graph/store.svelte.ts` | Rows land at their absolute index; batches out of order lose nothing; a superseded token is dropped for both events; reload keeps the old rows until the new walk delivers — clearing first is what makes a refresh flash; the selection follows its commit to a new row, and is dropped when the commit never reappears; `ensure` asks only as the viewport approaches the end and stops once complete; a slow detail load superseded by a newer selection is discarded |
| `graph/rows.test.ts` | `CommitRows`, `LaneCanvas` | It is a listbox of options; the sizer spans the whole history while only a screenful exists as DOM; each row is positioned by its own index; click selects and double-click opens; arrows, Home, End and Enter, stopping at both ends; at most two ref chips with the overflow still naming every ref; a time only on the first row of a day; the lane column widens immediately and narrows only after a delay — shrinking on sight would make the message column jump under the reader's eyes; the canvas sizes for the device pixel ratio and stays out of the click path |
| `graph/CommitDetail.test.ts` | `CommitDetail` | Empty, loading and error states; author distinguished from committer; a root commit says so; file counts singular and plural; path and tree grouping; a dotfile still reads as a dotfile; the full SHA is what gets copied, the confirmation is brief, and a refused clipboard does not claim success |
| `diff/split.test.ts` | `src/lib/diff/split.ts` | Context lines appear in both columns and flush the pending run — without the flush the two sides drift apart; runs pair row by row with blanks opposite the longer tail; additions pair with the removals *before* them, matching the order git emits; every input line survives on the side it belongs to |
| `diff/store.test.ts` | `src/lib/diff/store.svelte.ts` | Two-step load and first-file selection; a re-opened commit is not refetched; the per-path cache and that it is thrown away when the commit changes; a cached file has no loading flash; superseded commit and file loads are dropped; `step` clamps at both ends; the view choice persists and survives unavailable storage |
| `diff/panes.test.ts` | `FileList`, `DiffPane` | Line counts, and `bin` / `big` instead of `+0 −0`; selection; unified numbering with the empty cell on the side a line does not exist; split pairing and the tinted blank; binary, too-large and mode-only messages, which are three different sentences; the focused hunk is scrolled to |
| `ui/ui.test.ts` | `Btn`, `Chip`, `RefChip`, `ScreenStub` | A disabled button does not call its handler; a chip with a handler is a button and one without is a span — a clickable-looking element that does nothing is worse than a label; the current branch is the only checked chip; a tag is tellable from a branch without a label; the stub says what the screen will be and that it is not built |
| `ui/Splitter.test.ts` | `Splitter` | It is a focusable separator reporting its own width; dragging widens the rail rightward and the detail panel leftward; clamping; a non-left button is ignored; storage is written once at the end of a drag; arrows and shift-arrows resize, Home resets, other keys are left alone |
| `chrome/chrome.test.ts` | `TitleBar`, `Toolbar`, `NavRail`, `ResizeEdges` | The title bar names the repository or falls back to the product, says where a detached HEAD is, states the license and version, and offers all three window controls — whose clicks must not also maximize the bar; the toolbar counts what the commit button would commit and says plain "Commit" while the count is unknown; unbuilt actions carry their reason; the rail marks exactly one item, shows `·` rather than `0` for an uncomputed count, and reaches each screen; the resize frame has all eight regions and lets a right-click fall through |
| `chrome/window.test.ts` | `src/lib/chrome/window.ts` | Outside Tauri every control is a no-op rather than a throw, so the UI still runs in a browser; inside it, each control forwards and the resize edge is passed through |

## Rust

| Module | What the tests assert |
| --- | --- |
| `repo.rs` | A missing path and a non-repository both name the path; discovery walks upward from a subdirectory the way `git` does; `info` names the repository after its directory; an unborn HEAD is a repository with no commits rather than a failure, and is not "detached"; a detached HEAD reports no branch; a sync handle reopens as the same repository |
| `refs.rs` | Each kind of ref counted once; the current branch known and marked; an annotated tag peeled onto its commit — without which a tag chip would never appear, since the walk only yields commits; lightweight tags too; names shortened for display; the current branch sorts first and branches before tags, because the gutter collapses overflow; `origin/HEAD` is not a chip; `refs/stash` and `refs/notes` are not history labels; an empty repository is not an error |
| `status.rs` | Ref-derived counts come from the index; counts for screens that do not exist are `None`, not `0`; stash entries counted from the reflog, and no stash is `None` rather than an error; no submodules is `0` rather than nothing, and a declared submodule is counted |
| `graph.rs` (walk) | Every commit delivered once, in index order, matching `git rev-list` over the same tips; newest first; a row carries everything needed to paint it; the summary is the first line; ref chips land on their commits; a merged branch occupies a second lane; the sink can stop the walk before the end of history — the backpressure the windowing depends on; an empty repository says it is empty; `all_tips` includes a branch not merged into HEAD and does not repeat a commit several refs point at |
| `diff.rs` (repository) | Both signatures and the message body; an unknown commit names it; totals match the files listed; added, deleted and root-commit cases; a merge diffed against its first parent; a binary file reports no counts; hunk content and a header compared against `git show`'s own; a path in neither side is `UnknownPath` |
| `shell.rs` | The `git` version is read from the binary on PATH and returned clean; a failing command carries git's own stderr, which is almost always more useful than anything written in its place |
| `src-tauri/src/watch.rs` | A read is not a change — the filter that stops reading refs from looking like refs moving, which would reload the graph forever; an atime bump is not a ref moving; a written, created, renamed or removed ref is; `HEAD` and `packed-refs` count as refs and `index` as the worktree; `.lock` files are ignored so nothing is read mid-write; one event touching both reports both |

## Known gaps

- **Everything in `src-tauri` that takes an `AppHandle`** — the graph worker's
  windowing, the debounce loop, and every command. `mock_app` supplies an
  `AppHandle<MockRuntime>` and these are bound to Wry, so they cannot be
  constructed in a test. Recorded as **TASK-003**, with the list of what to
  assert once the layer is generic over `Runtime`.
- **`error.rs`** shows 0%: its `Display` text is only exercised through the
  errors other modules return, and `Serialize` only across the IPC boundary.
- **The workflows have never run.** There is no remote. Gate correctness is
  unproven until the first push.
