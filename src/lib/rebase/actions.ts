// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Running a planned rebase, and asking first (FEAT-015).
 *
 * This is the most destructive thing Spagitty does. Every other write either
 * adds something or moves a ref; a rebase replaces a run of commits with new
 * ones, and the originals survive only in the reflog. So the confirmation names
 * all four of the things the item asked for — the branch, how many commits, what
 * happens to the old ones, and how long they last — rather than asking "are you
 * sure".
 *
 * Abort has its own question. `git rebase --abort` is safe for the rebase, but
 * it also throws away the conflict resolutions done since it stopped, and
 * nothing gets those back.
 */

import { rebase } from '$lib/rebase/store.svelte';
import { dialog } from '$lib/ui/dialog.svelte';
import { notice } from '$lib/ui/notice.svelte';

/** How long git keeps unreachable commits by default. */
const REFLOG_DAYS = 30;

/**
 * What running this plan will do, in plain words.
 *
 * `branch` is what is being rewritten and `count` is how many commits move. A
 * plan that drops commits is worth saying out loud separately: those do not
 * come back as new commits at all.
 */
export function runBody(branch: string, count: number, dropped: number): string {
	const commits = `${count} ${count === 1 ? 'commit' : 'commits'}`;
	const where = branch === '' ? 'this branch' : branch;

	const base =
		`${commits} on ${where} are replaced by new ones with new ids. The originals ` +
		`stay in the reflog for ${REFLOG_DAYS} days, and nothing else points at them.`;

	if (dropped === 0) return base;

	return (
		`${base} ${dropped} ${dropped === 1 ? 'commit is' : 'commits are'} dropped ` +
		`by this plan and will not be replaced at all.`
	);
}

/** Ask, then start the rebase. Resolves once it has *started*. */
export async function runRebase(branch: string, count: number, dropped: number): Promise<boolean> {
	if (count === 0) return false;

	const agreed = await dialog.confirm({
		title: `Rebase ${count} ${count === 1 ? 'commit' : 'commits'}`,
		body: runBody(branch, count, dropped),
		confirmLabel: 'Rebase',
		danger: true
	});
	if (!agreed) return false;

	return rebase.run();
}

/**
 * Carry on with a rebase that stopped.
 *
 * No question: continuing is what the user came back to do, and git refuses it
 * anyway while anything is still conflicted.
 */
export async function continueRebase(): Promise<boolean> {
	const ok = await rebase.continue();
	if (ok && !rebase.stopped) notice.ok('The rebase finished');
	else if (!ok) notice.failed('Could not continue the rebase', rebase.runError);
	return ok;
}

/** Ask, then drop the commit it stopped on. */
export async function skipCommit(): Promise<boolean> {
	const agreed = await dialog.confirm({
		title: 'Skip this commit',
		body: 'The commit the rebase stopped on is dropped. Its changes are not in the result, and it survives only in the reflog.',
		confirmLabel: 'Skip',
		danger: true
	});
	if (!agreed) return false;

	return rebase.skip();
}

/** Ask, then unwind the whole thing back to where the branch started. */
export async function abortRebase(): Promise<boolean> {
	const agreed = await dialog.confirm({
		title: 'Abort the rebase',
		body: 'The branch goes back to exactly where it was before the rebase started. Any conflicts resolved since it stopped are thrown away with it.',
		confirmLabel: 'Abort',
		danger: true
	});
	if (!agreed) return false;

	const ok = await rebase.abort();
	if (ok) notice.ok('The rebase was aborted');
	else notice.failed('Could not abort the rebase', rebase.runError);
	return ok;
}
