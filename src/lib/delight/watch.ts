// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Turning finished git operations into events (FEAT-072).
 *
 * The seam between the application and the delight layer. Everything on this
 * side already knows an operation succeeded; everything on the other side wants
 * a shape with numbers in it, and working those numbers out is the part with
 * enough judgement in it to be worth testing on its own.
 *
 * # Every function here is fire-and-forget
 *
 * Nothing returns a value the caller acts on, nothing throws, and nothing is
 * awaited by an action. A badge is not worth one millisecond of a commit, let
 * alone a failure — so the calls are `void`-ed at their call sites and any
 * error inside is swallowed here rather than surfacing beside git's own.
 *
 * # The one extra read, and why it is allowed
 *
 * `commitLanded` calls `commitDiff` for the commit that was just written. It is
 * the same call the Diff screen makes when somebody clicks that commit, it is
 * bounded by the commit's own size, and it buys the difference between "you
 * committed" and "you fixed a bug in four lines" — which is the difference
 * between a badge worth having and a participation medal. Nothing else here
 * reads anything.
 */

import * as api from '$lib/api';
import { delight } from './store.svelte';
import { agentFromMessage, isDefaultBranch, type ActorRef } from './events';

/** Paths that look like tests rather than implementation. */
const TEST_PATH = /(^|\/)(tests?|spec|__tests__)(\/|$)|\.(test|spec)\.[a-z]+$|_test\.[a-z]+$/i;

/** A subject claiming the change preserves behaviour. */
const REFACTOR = /\b(refactor|refactoring|restructure|extract|rename|tidy)\b/i;

/** The directory a path belongs to, for the spaghetti count. */
function directory(path: string): string {
	const cut = path.lastIndexOf('/');
	return cut === -1 ? '' : path.slice(0, cut);
}

/**
 * A commit landed.
 *
 * `message` is the one that was just written, which is where the agent
 * attribution comes from: a commit carrying a `Co-authored-by` trailer naming a
 * model is that model's work as far as this repository is concerned, and
 * crediting it to the person who pressed the button would make the agent
 * comparison meaningless from the first day.
 */
export async function commitLanded(message: string, amend: boolean): Promise<void> {
	try {
		const { info } = await api.snapshot();
		const id = info.head.id;
		if (!id) return;

		const diff = await api.commitDiff(id);
		const paths = diff.files.map((file) => file.path);

		delight.record(
			{
				kind: 'commit',
				files: paths.length,
				directories: new Set(paths.map(directory)).size,
				added: diff.added,
				removed: diff.removed,
				onDefaultBranch: isDefaultBranch(info.head.branch),
				amend,
				// Tests *and* something else: a commit that is only tests is a
				// good thing, but it is not the habit Test Goblin is about.
				tests:
					paths.some((path) => TEST_PATH.test(path)) &&
					paths.some((path) => !TEST_PATH.test(path)),
				refactor: REFACTOR.test(message.split('\n')[0] ?? '')
			},
			agentFromMessage(message) ?? undefined
		);
	} catch {
		// The snapshot or the diff was unavailable. Nothing is owed here.
	}
}

/** A conflicted operation was carried through to the end. */
export function conflictsResolved(files: number, operation: string, actor?: ActorRef): void {
	delight.record({ kind: 'conflict', files, operation }, actor);
}

/** A rebase finished, however hard it was. */
export function rebaseFinished(commits: number, conflicts: number, interactive: boolean): void {
	delight.record({ kind: 'rebase', commits, conflicts, interactive });
}

export function cherryPicked(commits: number): void {
	delight.record({ kind: 'cherryPick', commits });
}

export function merged(fastForward: boolean): void {
	delight.record({ kind: 'merge', fastForward });
}

/** Work that was gone and came back. */
export function recovered(how: 'reflog' | 'detached' | 'rebase'): void {
	delight.record({ kind: 'recovery', how });
}

export function switchedBranch(): void {
	delight.record({ kind: 'checkout', at: Date.now() });
}

export function pushed(force: boolean): void {
	delight.record({ kind: 'push', force });
}

export function branchDeleted(name: string): void {
	delight.record({ kind: 'branchDeleted', name });
}
