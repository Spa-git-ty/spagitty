// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Telling the delight layer what the farm did (FEAT-077).
 *
 * `AgentTaskEvent` has been in `src/lib/delight/events.ts` since FEAT-072 with
 * this comment on it:
 *
 * > This is the event the agent farm feeds. Nothing in Spagitty emits it yet —
 * > the farm is what will
 *
 * Half the badge catalogue reads it. This is the seam that finally connects
 * them, and it is deliberately the same shape as `delight/watch.ts`: everything
 * here is fire-and-forget, nothing returns a value the caller acts on, and
 * nothing throws. A badge is not worth one millisecond of a merge, let alone a
 * failure beside it.
 *
 * # Why a task, and not a run
 *
 * A run is a process; a task reaching `Done` is a piece of work that survived
 * verification and a review by a different agent. That is the thing worth
 * scoring, and it is also the only point at which every fact the event wants —
 * did the tests pass, did the reviewer approve, how many times was it sent
 * back — is known.
 */

import { delight } from '$lib/delight/store.svelte';
import type { ActorKind, ActorRef } from '$lib/delight/events';
import type { Review, Task, Verification } from './types';

/**
 * Which kind of actor an agent id names.
 *
 * The farm's agent ids are its own — `claude`, `codex`, a custom agent's slug —
 * and the delight layer's kinds are a fixed set it draws with. Anything it does
 * not recognise is `agent`, which is a real kind and not a fallback: a custom
 * agent is an agent, and being unable to name its model is not a reason to
 * refuse it a record.
 */
export function actorKind(agent: string): ActorKind {
	const id = agent.toLowerCase();
	if (id.includes('claude')) return 'claude';
	if (id.includes('codex')) return 'codex';
	if (id.includes('gemini')) return 'gemini';
	if (/\bgpt\b|openai/.test(id)) return 'gpt';
	if (id.includes('pi') || id.includes('local') || id.includes('ollama')) return 'local';
	return 'agent';
}

/** The actor a farm agent id stands for. */
export function actor(agent: string): ActorRef {
	return { id: agent, kind: actorKind(agent), name: agent };
}

/**
 * A task the farm has taken all the way to `Done`.
 *
 * `corrections` is the attempt count less the first one: a task done on its
 * first attempt was corrected zero times, which is what the First Try badge is
 * about. `handoff` is true when the whole chain — planned, implemented,
 * reviewed — happened without a person being asked, which at Semi-automatic
 * and above is the normal case and at Manual never happens.
 */
export function taskCompleted(
	task: Task,
	verification: Verification | null,
	review: Review | null
): void {
	const agent = task.implementedBy ?? task.assignedAgent;
	if (!agent) return;

	delight.record(
		{
			kind: 'agentTask',
			// "Nothing checked it" is not a pass. The same rule the Farm screen
			// states in words, in the one place it could quietly become a lie.
			testsPassed: verification !== null && verification.passed && !verification.unverified,
			approved: review?.decision === 'approve',
			corrections: Math.max(0, task.attempts - 1),
			difficulty: task.kind === 'architecture' || task.dependsOn.length > 0 ? 'hard' : 'routine',
			// A review happened at all, which in this farm means a *different*
			// agent read it: `reviewer::pick` refuses a self-review, so the
			// existence of a verdict is the handoff.
			handoff: review !== null,
			// The farm has no way to know a change failed somewhere else. It is
			// false rather than absent, because the badge that reads it is about
			// a thing this repository observed.
			failedElsewhere: false
		},
		actor(agent)
	);
}

/**
 * A review the farm completed, by one agent on another's work.
 *
 * Recorded against the *reviewer*, because the thing being scored is having
 * caught something. The reviewer is passed in rather than read from the
 * verdict: a `Review` is what an agent said, and who said it is the farm's
 * record rather than part of the words.
 */
export function reviewCompleted(reviewer: string, review: Review): void {
	delight.record(
		{
			kind: 'review',
			caughtRegression: review.decision !== 'approve' && review.issues.length > 0,
			// Nobody else had looked: the farm's review is the first pair of
			// eyes on the change after the agent that wrote it.
			missedByOthers: review.decision !== 'approve' && review.issues.length > 0
		},
		actor(reviewer)
	);
}
