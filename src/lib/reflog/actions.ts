// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Getting back to where a ref used to be (FEAT-050).
 *
 * Three ways out of a reflog entry, and they are deliberately offered in this
 * order of prominence:
 *
 * 1. **Branch here** — creates a ref at that commit and changes nothing else.
 *    It is the only one of the three that cannot cost anything, and it is what
 *    FEAT-013's delete warning already tells people to type.
 * 2. **Check out here** — a detached HEAD at that commit. Safe, and reversible
 *    by checking out a branch again.
 * 3. **Reset the branch here** — moves the branch and discards the working
 *    tree. This is the one that can lose work that is not in the reflog at all,
 *    because uncommitted changes were never in it.
 *
 * A screen about recovery that led with `reset --hard` would be a screen that
 * turns one mistake into two.
 */

import { recovered } from '$lib/delight/watch';
import { reflog } from '$lib/reflog/store.svelte';
import { dialog } from '$lib/ui/dialog.svelte';
import { notice } from '$lib/ui/notice.svelte';
import type { ReflogEntry } from '$lib/types';

/** A name that will not collide, for the branch-here prompt to start from. */
export function suggestedName(entry: ReflogEntry): string {
	return `recovered/${entry.afterShort}`;
}

/** Ask for a name, then create a branch at the entry. */
export async function branchHere(entry: ReflogEntry): Promise<boolean> {
	const name = await dialog.prompt({
		title: `Branch at ${entry.revision}`,
		body: `A new branch at ${entry.afterShort}. Nothing that exists now is moved or lost, and the branch you are on stays where it is.`,
		label: 'Branch name',
		value: suggestedName(entry),
		confirmLabel: 'Create'
	});
	if (name === null || name.trim() === '') return false;

	const made = await reflog.branchAt(name, entry.after);
	if (made) {
		notice.ok(`${name.trim()} is at ${entry.afterShort}`);
		// Reaching into the reflog for a commit nothing points at any more is
		// the recovery this application exists to make ordinary (FEAT-072).
		recovered('reflog');
	}
	else notice.failed('Could not create the branch', reflog.writeError);
	return made;
}

/** Ask, then check the entry out with no branch attached. */
export async function checkoutHere(entry: ReflogEntry): Promise<boolean> {
	const agreed = await dialog.confirm({
		title: `Check out ${entry.revision}`,
		body: `The working tree goes to ${entry.afterShort} with no branch attached. Checking out a branch again puts everything back; committing here needs a branch first.`,
		confirmLabel: 'Check out'
	});
	if (!agreed) return false;

	const done = await reflog.checkoutAt(entry.after);
	if (done) {
		notice.ok(`Detached at ${entry.afterShort}`);
		recovered('reflog');
	}
	else notice.failed('Could not check it out', reflog.writeError);
	return done;
}

/**
 * What resetting to this entry costs.
 *
 * The uncommitted-work sentence is the important half. Everything a reset moves
 * past is *in* the reflog and recoverable from this very screen; what is in the
 * working tree was never in it, and that is the part that does not come back.
 */
export function resetBody(entry: ReflogEntry): string {
	return (
		`The branch you are on moves to ${entry.afterShort}, and the working tree ` +
		`is made to match it. Commits it moves off are still in this reflog. ` +
		`Uncommitted changes are not in any reflog and will be lost.`
	);
}

/** Ask, then move the current branch to the entry. */
export async function resetHere(entry: ReflogEntry): Promise<boolean> {
	const agreed = await dialog.confirm({
		title: `Reset to ${entry.revision}`,
		body: resetBody(entry),
		confirmLabel: 'Reset',
		danger: true
	});
	if (!agreed) return false;

	const done = await reflog.resetTo(entry.after);
	if (done) {
		notice.ok(`Reset to ${entry.afterShort}`);
		recovered('reflog');
	}
	else notice.failed('Could not reset', reflog.writeError);
	return done;
}
