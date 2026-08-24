// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Deleting and renaming branches, and asking first (FEAT-013).
 *
 * Deleting a merged branch loses nothing. Deleting an unmerged one leaves
 * commits reachable only through the reflog until git expires them, which is
 * recoverable but only by somebody who knows how — so the confirmation carries
 * the actual command, with the actual short id in it. A warning that says
 * "you can get it back from the reflog" and stops there is a warning that
 * assumes the reader already did not need it.
 *
 * The wording lives here rather than at the call sites because the graph's
 * branch label offers the same two operations, and two copies of a sentence
 * about losing commits is one copy too many.
 */

import { branches } from '$lib/branches/store.svelte';
import { dialog } from '$lib/ui/dialog.svelte';
import type { BranchRow } from '$lib/types';

/**
 * What deleting this branch costs, and what undoes it.
 *
 * `tip` is the branch's short id when the caller has it. Without one the
 * sentence still names the commands, because `git reflog` is where the id comes
 * from and that is the part people do not know.
 */
export function deleteBody(name: string, merged: boolean, tip?: string): string {
	if (merged) {
		return `Everything on ${name} is already in the branch you have checked out, so nothing is lost.`;
	}

	const recover = tip
		? `git branch ${name} ${tip}`
		: `git reflog, then git branch ${name} <id>`;

	return (
		`${name} has commits that are on no other branch. Deleting it leaves them ` +
		`reachable only through the reflog, until git expires them. To get the ` +
		`branch back: ${recover}`
	);
}

/**
 * Why a row cannot be deleted, or null when it can.
 *
 * Git refuses the checked-out branch itself and the core refuses it again, but
 * both of those happen after the click. The screen knows before, and a control
 * that explains itself beats one that fails.
 */
export function undeletable(row: BranchRow): string | null {
	if (row.current) return 'This is the branch you have checked out';
	if (row.kind !== 'branch') {
		return 'Only local branches are deleted here — a remote-tracking ref follows its remote';
	}
	return null;
}

/** Ask, then delete one branch. */
export async function deleteBranch(row: BranchRow): Promise<boolean> {
	const refusal = undeletable(row);
	if (refusal !== null) return false;

	const agreed = await dialog.confirm({
		title: `Delete ${row.name}`,
		body: deleteBody(row.name, row.merged, row.short),
		confirmLabel: 'Delete',
		danger: !row.merged
	});
	if (!agreed) return false;

	return branches.delete(row.name, !row.merged);
}

/** Ask for the new name, then rename. */
export async function renameBranch(row: BranchRow): Promise<boolean> {
	if (row.kind !== 'branch') return false;

	const next = await dialog.prompt({
		title: `Rename ${row.name}`,
		body: 'The upstream configuration and the reflog come with it. A remote that already has the branch keeps the old name.',
		label: 'New name',
		value: row.name,
		confirmLabel: 'Rename'
	});
	if (next === null || next.trim() === '' || next === row.name) return false;

	return branches.rename(row.name, next);
}

/**
 * Every local branch that is merged and not checked out.
 *
 * The current branch is always "merged into itself" and is exactly what a bulk
 * cleanup must not touch.
 */
export function mergedBranches(rows: BranchRow[]): BranchRow[] {
	return rows.filter((row) => row.kind === 'branch' && row.merged && !row.current);
}

/**
 * Ask, showing the whole list, then delete every merged branch.
 *
 * The list is in the dialog rather than summarised as a count. "Delete 14
 * branches" is a number people agree to; fourteen names is a thing people read,
 * and this is the one operation on the screen that touches refs the user did
 * not individually point at.
 */
export async function deleteMerged(rows: BranchRow[]): Promise<boolean> {
	const merged = mergedBranches(rows);
	if (merged.length === 0) return false;

	const names = merged.map((row) => row.name);
	const agreed = await dialog.confirm({
		title: `Delete ${names.length} merged ${names.length === 1 ? 'branch' : 'branches'}`,
		body:
			`Everything on these is already in the branch you have checked out, so ` +
			`nothing is lost:\n\n${names.join('\n')}`,
		confirmLabel: 'Delete',
		danger: false
	});
	if (!agreed) return false;

	// Never `-D` here. A branch that turned out not to be merged after all —
	// the list is a moment old — must fail rather than be forced through.
	return branches.deleteMany(names, false);
}
