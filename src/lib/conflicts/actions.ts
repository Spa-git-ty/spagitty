// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Resolving conflicts, and the two questions worth asking (FEAT-016).
 *
 * Most of what this screen does is safe. Taking a side writes the working file
 * and the index still holds all three stages, so a wrong click costs another
 * click. Two things are not like that:
 *
 * - **Abort** throws the whole operation away, and what returns to what depends
 *   on which operation it was. A merge goes back to `HEAD`; a rebase goes back
 *   to where the branch started; a cherry-pick or revert leaves the commits it
 *   already made. Saying "this will be undone" without saying which would be
 *   asking someone to agree to something they cannot picture.
 * - **Leaving a dirty draft.** The merged pane is editable, so there is text on
 *   screen that is not on disk. The item named silently discarding it as the
 *   thing not to do, so it is a question rather than a side effect.
 */

import { conflicts } from '$lib/conflicts/store.svelte';
import { dialog } from '$lib/ui/dialog.svelte';
import { notice } from '$lib/ui/notice.svelte';
import type { ConflictOperation } from '$lib/types';

/**
 * What aborting this operation puts back, in the words of that operation.
 *
 * Written per operation rather than generically because the answers genuinely
 * differ, and the one people get wrong is cherry-pick: aborting does not undo
 * the commits it already made.
 */
export function abortBody(operation: ConflictOperation): string {
	switch (operation) {
		case 'merge':
			return 'The working tree and the index go back to where they were before the merge started. Nothing that was already committed is touched.';
		case 'rebase':
		case 'rebaseInteractive':
			return 'The branch goes back to exactly where it was before the rebase started, at ORIG_HEAD. Every commit replayed so far is undone, and so is every conflict resolved since.';
		case 'cherryPick':
			return 'The cherry-pick stops and the working tree goes back to the last commit. Commits it already made stay — only the one it stopped on is abandoned.';
		case 'revert':
			return 'The revert stops and the working tree goes back to the last commit. Commits it already made stay.';
		default:
			return 'The operation is abandoned and the working tree goes back to the last commit.';
	}
}

/** Ask, then abort. */
export async function abortOperation(operation: ConflictOperation): Promise<boolean> {
	if (operation === 'none') return false;

	const agreed = await dialog.confirm({
		title: `Abort the ${label(operation)}`,
		body: abortBody(operation),
		confirmLabel: 'Abort',
		danger: true
	});
	if (!agreed) return false;

	const ok = await conflicts.abort();
	if (ok) notice.ok(`The ${label(operation)} was aborted`);
	else notice.failed(`Could not abort the ${label(operation)}`, conflicts.writeError);
	return ok;
}

/**
 * Carry on with the operation.
 *
 * No question: git refuses while anything is still conflicted, so the button
 * cannot do harm, and being stopped by git with its own message is a better
 * answer than a dialog guessing at one.
 */
export async function continueOperation(operation: ConflictOperation): Promise<boolean> {
	const ok = await conflicts.continue();
	if (ok) notice.ok(`The ${label(operation)} finished`);
	else notice.failed(`Could not continue the ${label(operation)}`, conflicts.writeError);
	return ok;
}

/**
 * Ask about an unsaved edit before leaving the file it belongs to.
 *
 * Three answers, and the third is the reason this is a prompt-shaped question
 * rather than a plain confirm: save it, throw it away, or stay where you are.
 * Resolves true when the move may go ahead.
 */
export async function leaveDraft(): Promise<boolean> {
	if (!conflicts.dirty) return true;

	const agreed = await dialog.confirm({
		title: 'Unsaved changes to the merged file',
		body: 'You have edited the merged result without saving it. Leaving this file throws that edit away.',
		confirmLabel: 'Discard the edit',
		danger: true
	});
	if (!agreed) return false;

	conflicts.discardDraft();
	return true;
}

/** Move to another conflicted file, asking about an unsaved edit first. */
export async function openFile(path: string): Promise<void> {
	if (!(await leaveDraft())) return;
	await conflicts.select(path, true);
}

/** Step through the pager, asking about an unsaved edit first. */
export async function stepFile(by: number): Promise<void> {
	if (!(await leaveDraft())) return;
	await conflicts.step(by);
}

function label(operation: ConflictOperation): string {
	return operation === 'rebaseInteractive' ? 'interactive rebase' : operation;
}
