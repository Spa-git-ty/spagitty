<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-019 — Plan

**Item:** [`agile/items/TASK-019-resume-session.md`](../items/TASK-019-resume-session.md)

## Approach

Move the launch sequence out of `onMount` and into `src/lib/session.ts`, behind
a port the shell fills in. The module performs the order; the port performs the
effects.

```ts
export interface ResumePort {
	launchPath(): Promise<string | null>;
	open(path: string): Promise<boolean>;
	active(): string | null;
	placeOf(path: string): Place | null;
	route(): string;
	goto(route: string): Promise<void>;
	want(id: string): void;
	cancelled(): boolean;
}

export async function resumeSession(port: ResumePort): Promise<void>;
```

## The alternative that was rejected

A pure function returning a plan — `{ kind: 'launch', path }` or
`{ kind: 'resume', path, route, selected }` — with the shell carrying it out.

It is simpler and it needs no port. It also cannot express the branch that
matters: *open, and navigate only if the open succeeded*. That conditional would
have stayed in the shell, which is where the untestable code was in the first
place, so the refactor would have moved the easy half and left the hard half
behind.

The port costs one interface with eight members that exists for one caller. That
is the kind of ceremony Amendment 7 warns about, and it is bought here by the
one thing it buys: the failure this module exists for is *a call that does not
happen*, and only a recording port can assert on that.

## Files

| File | Change |
| --- | --- |
| `src/lib/session.ts` | new — the port and `resumeSession` |
| `src/lib/session.test.ts` | new — thirteen assertions over the order |
| `src/routes/+layout.svelte` | the sequence replaced by one call and the real port |

## Steps

1. Write `src/lib/session.ts`, copying the sequence out of the shell line for
   line: the cancellation check before the launch path, the launch path winning
   outright, the place read before the open, the open's failure stopping
   everything, the second cancellation check, then the route and the want.
2. Write `src/lib/session.test.ts` with a port that appends every call to a list,
   and assert the list.
3. Replace the sequence in `src/routes/+layout.svelte` with one `await
   resumeSession({...})`, binding each port member to what the shell already
   held: `api.launchPath`, `repo.open`, `workspace.active`, `workspace.placeOf`,
   `page.url.pathname`, `goto`, `graph.want`, and the shell's own `cancelled`.
4. Run `npm run check` and the suite: the sequence is unchanged, so nothing else
   moves.

## Risks

- **Copying the order wrongly.** The whole point is that the shell's version was
  unverifiable, so a mistake made while moving it would be invisible in the same
  way. Mitigated by moving it literally — same guards, same order, same
  comments — and by the sweep, which exercises the four launches by hand.
- **The port drifting from the shell.** `ResumePort` is typed, so a shell that
  stops supplying a member fails `npm run check` rather than at runtime.

## Rollback

The module is additive and the shell's call is one statement. Reverting the
commit restores the sequence in `onMount` exactly as it was.
