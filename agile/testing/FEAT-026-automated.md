<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-026 — Automated tests

## Run result

```
npm test        806 passed, 0 failed   (48 files)
npm run check   982 files, 0 errors, 0 warnings
```

Four tests added to `src/lib/panels.test.ts`, and one existing assertion updated
because the stored layout now carries `railCollapsed`.

## The tests

| Test | Asserts |
| --- | --- |
| `narrows the variable every other panel lays itself out against` | Collapsing sets `--rail-w` to 48px — the point being that it changes the shared variable, not just the rail's own class |
| `gives back the width that was dragged, not the default` | Expanding returns 300px, the width the user had, rather than the design's 186 |
| `survives a restart` | The flag is written to storage and `init` puts it back, republishing the collapsed variable |
| `is undone by a reset` | A reset expands, because a collapsed rail is not a design width |

## What is not covered by automation

- The rendering: glyphs, the button's arrow direction, the tooltip. Those are
  SWEEP-026-01 and -02.
- That the splitter is inert while collapsed. The guard is one condition on two
  handlers; whether it *feels* inert is a sweep ticket.
