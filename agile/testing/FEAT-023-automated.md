<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-023 — Automated tests

## Run result

```
npm test        789 passed, 0 failed   (46 files)
npm run check   981 files, 0 errors, 0 warnings
cargo test      272 passed, 0 failed
```

The count moved from 790 to 789 because 16 portrait tests and one merge-node
test arrived while 18 tests for `ancestry`, `ghostPath` and `rowOfRef` left with
the code they covered, to `~/claudetrashbin/gitlord-FEAT-023/`.

## Coverage

| Tree | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| `src/lib/graph/portrait.ts` | 82.85% | 46.15% | 100% | 84.37% |
| `src/lib/graph/lanes.ts` | 59.85% | 69.38% | 66.66% | 59.37% |
| Frontend total | 79.19% | 62.97% | 75.17% | 78.70% |

`portrait.ts`'s uncovered lines are the tile cache's rendering path:
happy-dom gives no 2d context, so `portraitTile` returns null there and the
branches that copy pixels cannot run. Those are covered by the browser harness
below rather than left unverified. `lanes.ts` is a canvas drawing routine tested
through a recording context; the lines outside that are the ghost drawing that
went, and the stash overlay.

The frontend's branch total remains below the configured 70% threshold — 62.97%
here against 63.45% before, the difference being tests leaving with the hover
code. That gate has been red since FEAT-022 and is not this item's doing; it
wants a task of its own.

## `portrait.test.ts`, 16 tests

| Group | Asserts |
| --- | --- |
| The seed | The email wins, case and whitespace do not matter, the name is the fallback, an empty pair does not throw |
| The face | Same address, same face; different address, different face; every colour inside the lane palette; three blobs, spread rather than centred; one character of difference moves the face |
| The CSS form | Painted with `var(--lane-N)` so a theme change repaints it, with no colour literal; three gradients over a base; every blob fades out at its edge |
| Drawing | Base fill first, then three gradients, each inside its own save/restore so the alpha cannot leak; a short palette cycles rather than running off the end |
| The cache | One render per author; a different palette is a different tile; `forgetPortraits` empties it |

## `lanes.test.ts`

Two tests were rewritten and one added, because the node is no longer one arc:

- `draws nodes on top of the edges that reach them` now compares the first arc
  against the last path command of an edge, since a head strokes its own ring.
- `draws one node per visible row` identifies a head by its radius and asserts
  one distinct centre per row.
- `draws a merge as a plain dot rather than a face` is new, and is the
  assertion that would fail if a merge started wearing the merge author's
  portrait.

## `metrics.test.ts`

`fits five lanes and their slack` now expects 129px rather than 96px, with the
arithmetic and the reason written beside it.

## Rust

`graph.rs`'s row test asserts `author_email` survives the walk, which is what
the portrait is generated from. 272 tests pass, unchanged in count.

## Looked at, not only measured

A harness bundles the real `drawLanes` and `portrait.ts` and draws a made-up
history — a branch, two merges, a stash, four authors — into a page carrying
`app.css`, rendered in headless Chrome. That is what the geometry was tuned
against: the first pass had heads that touched vertically and portraits whose
overlapping blobs went muddy, and neither is a thing a numeric assertion would
have reported. The screenshot is in the session and the harness is in the
session scratchpad, not in the repository — it is a lens, not a test.

## What is not covered by automation

- Scroll cost with the cache warm. The cache is asserted; its effect on frame
  time is SWEEP-023-08.
- That the faces are *distinguishable* on all eight palettes, which is a
  judgement about colour and belongs to the sweep.
- The graph column's fill against each theme.
