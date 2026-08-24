// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Throwing work away, and asking first (FEAT-048).
 *
 * Every other write on the Commit screen is reversible — staging is undone by
 * unstaging, a commit is undone by the reflog. These three are not: there is no
 * reflog for the working tree, and a discarded change is gone. So the wording
 * lives here rather than at the three call sites, and it is written to say what
 * will actually happen to *these* paths rather than a general warning nobody
 * reads twice.
 *
 * The distinction the sentence has to carry is tracked against untracked. A
 * modified file goes back to what is staged; an untracked file is deleted. Both
 * are "discard" on the button and they are not the same event, so the
 * confirmation names which one it is about to do.
 */

import { changes } from '$lib/changes/store.svelte';
import { dialog } from '$lib/ui/dialog.svelte';
import type { StatusEntry } from '$lib/types';

/** Untracked rows are deleted rather than reverted; the sentence says so. */
function untracked(entries: StatusEntry[]): StatusEntry[] {
	return entries.filter((entry) => entry.status === 'untracked');
}

/**
 * What is about to happen, in plain words.
 *
 * Three shapes, because three things can be true: everything is untracked and
 * will be deleted, nothing is and everything goes back to what is staged, or
 * it is a mix and both sentences are needed.
 */
export function discardBody(entries: StatusEntry[]): string {
	const gone = untracked(entries);
	const reverted = entries.length - gone.length;

	const deletion =
		gone.length === 1
			? `${gone[0].path} is not tracked by git, so it is deleted.`
			: `${gone.length} untracked files are deleted.`;

	// "The file" only reads right when it is the only sentence there is. In a
	// mixed selection it has to be counted, or it sounds like it is describing
	// the whole selection.
	const revert =
		reverted !== 1
			? `${reverted} files go back to what is staged for them.`
			: gone.length === 0
				? 'The file goes back to what is staged for it.'
				: '1 file goes back to what is staged for it.';

	if (gone.length === 0) return `${revert} This cannot be undone.`;
	if (reverted === 0) return `${deletion} This cannot be undone.`;
	return `${revert} ${deletion} This cannot be undone.`;
}

/** The title, which names how much is at stake before the body explains it. */
function title(entries: StatusEntry[]): string {
	return entries.length === 1
		? `Discard changes to ${entries[0].path}`
		: `Discard changes to ${entries.length} files`;
}

/**
 * Ask, then discard whole paths.
 *
 * Resolves false when the question was dismissed, which is also what the caller
 * gets when the write itself failed — neither is a case any caller acts on
 * differently, and the failure is already on screen as the write error.
 */
export async function discardPaths(entries: StatusEntry[]): Promise<boolean> {
	if (entries.length === 0) return false;

	const agreed = await dialog.confirm({
		title: title(entries),
		body: discardBody(entries),
		confirmLabel: 'Discard',
		danger: true
	});
	if (!agreed) return false;

	return changes.discard(entries.map((entry) => entry.path));
}

/** Ask, then discard every unstaged change on screen. */
export function discardAll(): Promise<boolean> {
	return discardPaths(changes.work.unstaged);
}

/**
 * Ask, then discard one hunk of the open file.
 *
 * The hunk is named by its header rather than counted, so the question is about
 * the thing the pointer is on and the backend refuses it outright if the file
 * has changed since the screen read it.
 */
export async function discardHunk(index: number, header: string): Promise<boolean> {
	const path = changes.selection?.path ?? 'this file';

	const agreed = await dialog.confirm({
		title: 'Discard this hunk',
		body: `These lines go back to what is staged for ${path}. The rest of the file is left alone. This cannot be undone.`,
		confirmLabel: 'Discard',
		danger: true
	});
	if (!agreed) return false;

	return changes.discardHunk(index, header);
}
