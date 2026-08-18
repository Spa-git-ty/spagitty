<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-007 — A replaced dialog resolves the wrong caller's cancel value

**Status:** Fixed — commit `1a0c6db` on `bugfix/BUG-007-replaced-dialog-cancel-value`.
**Found by:** TASK-005, while writing `src/lib/ui/Dialog.test.ts`.
**Screen:** any — the dialog store is application-wide.

## Problem

`dialog.svelte.ts` allows one question at a time: a second question while one is
open replaces the first and answers it as cancelled. That much is deliberate and
documented in the file.

The value it answers with is wrong. `ask()` takes the cancel value belonging to
the **incoming** question and uses it to settle the **outgoing** one:

```ts
function ask(next: Question, answerIfReplaced: Answer): Promise<Answer> {
	// Whatever was open loses; its caller is told so rather than left hanging.
	if (resolver) {
		resolver(answerIfReplaced);   // ← `answerIfReplaced` belongs to `next`
		resolver = null;
	}
	…
```

`confirm()` passes `false`; `prompt()` passes `null`. So a **prompt replaced by a
confirmation resolves `false`**, and a confirmation replaced by a prompt resolves
`null`.

## Why it matters

Every prompt caller guards on `null` specifically:

| Site | Guard |
| --- | --- |
| `src/lib/graph/actions.ts:84` | `if (name === null) return;` |
| `src/lib/graph/actions.ts:99` | `if (name === null) return;` |
| `src/lib/graph/actions.ts:302` | `if (next === null \|\| next === name) return;` |

`false` is not `null`, so the guard does not fire and execution continues into
`api.createBranch(name, id, true)` with `name === false`. A boolean is handed
where a branch name belongs — creating a branch literally named `false`, or
failing in whatever way the backend does with a non-string.

The confirmation direction is benign by luck rather than design: `null` is falsy,
so `if (!(await dialog.confirm(…))) return;` still returns.

## Reproduction

1. Open a naming prompt — *Create branch here* on any commit.
2. Without answering it, trigger an action that opens a confirmation. The command
   palette reaches one from the keyboard while the prompt is on screen.
3. The prompt's promise resolves `false` instead of `null`.
4. `createBranchAt` proceeds past its guard.

## Observed versus expected

| | |
| --- | --- |
| **Observed** | A replaced prompt resolves `false`. A replaced confirmation resolves `null`. |
| **Expected** | A replaced question resolves **its own** cancel value: a prompt `null`, a confirmation `false` — the same values `dismiss()` already produces for each kind. |

## Environment

Present on `main` at `3d14f22`. Not platform-specific — it is pure store logic.

## Scope when started

- `ask()` settles the outgoing question by **its own** `kind`, exactly as
  `settle()` already does in `dismiss()`: `question.kind === 'prompt' ? null : false`.
  The `answerIfReplaced` parameter then has no reason to exist and goes.
- A regression test that **fails without the fix** — Amendment 9 requires one on
  every fix.
- Tighten the two assertions in `src/lib/ui/Dialog.test.ts` that currently check
  falsiness rather than the exact value; they carry a comment pointing here.

## Non-scope

- Queueing dialogs. The file argues explicitly against stacking two modals, and
  that decision is not reopened here.

## Acceptance criteria

- A prompt replaced by a confirmation resolves `null`.
- A confirmation replaced by a prompt resolves `false`.
- `Dialog.test.ts` asserts both exactly, and the assertions fail if `ask()` is
  reverted.
- No caller in `graph/actions.ts` can proceed past its guard with a non-string.

## Dependencies

None. Independent of every item in the 2026-08-18 intake.
