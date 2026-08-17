// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * What the graph's menus actually do.
 *
 * The menus in `CommitRows` describe operations; this module performs them.
 * They are kept apart because the sentence shown before a `reset --hard` is as
 * much a part of the operation as the command itself, and burying it in a
 * component's markup means the next screen that offers the same operation
 * writes a different sentence — or none.
 *
 * Every function here follows the same three steps:
 *
 * 1. **Ask, when there is something to lose.** Losing operations always ask,
 *    whatever the Settings toggle says. `confirmHistoryRewrite` governs the
 *    rewrites that *move* commits rather than destroying them — a rebase can be
 *    undone from the reflog, a `reset --hard` of uncommitted work cannot.
 * 2. **Run it**, and let git's own refusal be the error text.
 * 3. **Re-read.** The filesystem watcher will notice too, but a graph that
 *    updates when the watcher gets round to it feels like a graph that did not
 *    do anything.
 *
 * Nothing here throws. A failed operation is a notice, because the caller is a
 * menu entry and a menu entry has nowhere to catch.
 */

import * as api from '../api';
import { graph } from './store.svelte';
import { repo } from '../repo.svelte';
import { settings } from '../settings/store.svelte';
import { dialog } from '../ui/dialog.svelte';
import { notice } from '../ui/notice.svelte';
import type { Integration, ResetMode, StashAction } from '../types';

/** Re-read HEAD, the counts and the walk. */
async function refresh(): Promise<void> {
	await repo.refresh();
	await graph.reload();
}

/**
 * Run `work`, report either way, and refresh on success.
 *
 * `success` is written in the past tense and names what changed, because it is
 * read after the fact: "Reset to a1b2c3d", not "Resetting…".
 */
async function perform(success: string, failure: string, work: () => Promise<unknown>) {
	try {
		await work();
		notice.ok(success);
		await refresh();
	} catch (error) {
		notice.failed(failure, error);
	}
}

/** Whether the user asked to be warned before history is rewritten. */
function warnsOnRewrite(): boolean {
	return settings.settings.confirmHistoryRewrite;
}

// --- Commits ---------------------------------------------------------------

/** Put a commit id on the clipboard. The full id, because that is what pastes usefully. */
export async function copyId(id: string, short: string): Promise<void> {
	try {
		await navigator.clipboard.writeText(id);
		notice.ok(`Copied ${short}`);
	} catch (error) {
		// A webview can refuse clipboard access outright, and silently failing to
		// copy is the kind of thing people only notice after pasting.
		notice.failed('Could not copy the commit id', error);
	}
}

export async function createBranchAt(id: string, short: string): Promise<void> {
	const name = await dialog.prompt({
		title: 'Create branch here',
		body: `The new branch will start at ${short} and be checked out.`,
		label: 'Branch name',
		placeholder: 'feature/…',
		confirmLabel: 'Create'
	});
	if (name === null) return;

	await perform(`Created ${name}`, 'Could not create the branch', () =>
		api.createBranch(name, id, true)
	);
}

export async function createTagAt(id: string, short: string): Promise<void> {
	const name = await dialog.prompt({
		title: 'Create tag here',
		body: `The tag will point at ${short}.`,
		label: 'Tag name',
		placeholder: 'v1.0.0',
		confirmLabel: 'Create'
	});
	if (name === null) return;

	await perform(`Tagged ${short} as ${name}`, 'Could not create the tag', () =>
		api.createTag(name, id)
	);
}

/** What each reset mode does, in the words the confirmation uses. */
const RESET_BODY: Record<ResetMode, (short: string) => string> = {
	soft: (short) =>
		`The branch moves to ${short}. Everything after it stays, staged and ready to commit again.`,
	mixed: (short) =>
		`The branch moves to ${short}. Everything after it stays in your files, unstaged.`,
	hard: (short) =>
		`The branch moves to ${short} and your files are put back to match it. ` +
		'Uncommitted changes are lost and cannot be recovered.'
};

export async function resetTo(id: string, short: string, mode: ResetMode): Promise<void> {
	// `hard` always asks. The other two move a branch, which the reflog can undo.
	if (mode === 'hard' || warnsOnRewrite()) {
		const agreed = await dialog.confirm({
			title: `Reset ${mode} to ${short}`,
			body: RESET_BODY[mode](short),
			confirmLabel: 'Reset',
			danger: mode === 'hard'
		});
		if (!agreed) return;
	}

	await perform(`Reset ${mode} to ${short}`, 'Could not reset', () => api.reset(id, mode));
}

export async function revertCommit(id: string, short: string): Promise<void> {
	const agreed = await dialog.confirm({
		title: `Revert ${short}`,
		body: 'A new commit is added that undoes this one. Nothing already in history is changed.',
		confirmLabel: 'Revert'
	});
	if (!agreed) return;

	await perform(`Reverted ${short}`, 'Could not revert', () => api.revert(id));
}

/**
 * Replay commits onto the current branch.
 *
 * `ids` is oldest-first, which is the order they will be applied in and the
 * order they were written in — the order most likely to apply cleanly.
 */
export async function cherryPick(ids: string[], labels: string[]): Promise<void> {
	if (ids.length === 0) return;

	const what = ids.length === 1 ? labels[0] : `${ids.length} commits`;
	const agreed = await dialog.confirm({
		title: `Cherry pick ${what}`,
		body:
			`${ids.length === 1 ? 'This commit is' : 'These commits are'} copied onto the ` +
			'branch you have checked out, oldest first. The originals stay where they are.',
		confirmLabel: 'Cherry pick'
	});
	if (!agreed) return;

	await perform(`Cherry picked ${what}`, 'Could not cherry pick', () => api.cherryPick(ids));
}

/**
 * Replay the current branch onto a commit that may have no branch of its own.
 *
 * This is the graph's answer to "I want to be based on that point" without
 * having to create a throwaway branch there first.
 */
export async function rebaseOntoCommit(id: string, short: string): Promise<void> {
	const agreed = await dialog.confirm({
		title: `Rebase onto ${short}`,
		body:
			'Your current branch is replayed on top of that commit. Its commits are rewritten, ' +
			'so anything already pushed will need a force push.',
		confirmLabel: 'Rebase',
		danger: true
	});
	if (!agreed) return;

	await perform(`Rebased onto ${short}`, 'Could not rebase', () => api.rebaseOnto(id));
}

/**
 * Move a run of commits onto a branch.
 *
 * `oldest` is the oldest commit of the selection; its parent is the upstream,
 * so the range that moves is exactly what was selected. A selection whose
 * oldest commit is a root has no parent to bound the range and is refused —
 * git would take it to mean the whole branch, which is not what was selected.
 */
export async function rebaseRangeOnto(
	oldest: { id: string; short: string; parents: string[] },
	count: number,
	target: string
): Promise<void> {
	if (oldest.parents.length === 0) {
		notice.failed(
			'Could not rebase the selection',
			'the oldest commit selected has no parent, so there is no range to move'
		);
		return;
	}

	const agreed = await dialog.confirm({
		title: `Rebase ${count} ${count === 1 ? 'commit' : 'commits'} onto ${target}`,
		body:
			`The run starting at ${oldest.short} is replayed on top of ${target}. ` +
			'Those commits are rewritten, so anything already pushed will need a force push.',
		confirmLabel: 'Rebase',
		danger: true
	});
	if (!agreed) return;

	await perform(
		`Rebased ${count} onto ${target}`,
		'Could not rebase the selection',
		// `<oldest>^` is the parent: everything after it, up to HEAD, moves.
		() => api.rebaseOnto(target, `${oldest.id}^`)
	);
}

export async function checkoutCommit(id: string, short: string): Promise<void> {
	const agreed = await dialog.confirm({
		title: `Check out ${short}`,
		body:
			'You will be on no branch — a detached HEAD. Commits made here belong to nothing ' +
			'until you create a branch for them.',
		confirmLabel: 'Check out'
	});
	if (!agreed) return;

	await perform(`Checked out ${short}`, 'Could not check out that commit', () =>
		api.checkoutDetached(id)
	);
}

// --- Branches --------------------------------------------------------------

export async function checkoutBranch(name: string): Promise<void> {
	await perform(`Switched to ${name}`, `Could not switch to ${name}`, () => api.checkout(name));
}

/** What each way of integrating one branch into another does, for the menu. */
export const INTEGRATIONS: { how: Integration; label: string; body: (s: string, t: string) => string }[] =
	[
		{
			how: 'merge',
			label: 'Merge',
			body: (source, target) =>
				`${source} is merged into ${target}. Git fast-forwards if it can, and writes a merge commit if it cannot.`
		},
		{
			how: 'mergeNoFastForward',
			label: 'Merge, always commit',
			body: (source, target) =>
				`${source} is merged into ${target} with a merge commit, even where a fast-forward was possible. The branch stays visible in the graph.`
		},
		{
			how: 'fastForward',
			label: 'Fast-forward',
			body: (source, target) =>
				`${target} moves up to ${source}. No commit is written, and git refuses rather than merging if it cannot.`
		},
		{
			how: 'rebase',
			label: 'Rebase',
			body: (source, target) =>
				`${target} is replayed on top of ${source}. Its commits are rewritten, so anything already pushed will need a force push.`
		}
	];

export async function integrate(source: string, target: string, how: Integration): Promise<void> {
	const entry = INTEGRATIONS.find((candidate) => candidate.how === how);
	if (!entry) return;

	const rewrites = how === 'rebase';
	if (rewrites || warnsOnRewrite()) {
		const agreed = await dialog.confirm({
			title: `${entry.label} ${source} into ${target}`,
			body: entry.body(source, target),
			confirmLabel: entry.label,
			danger: rewrites
		});
		if (!agreed) return;
	}

	await perform(`${entry.label}d ${source} into ${target}`, `Could not ${entry.label.toLowerCase()}`, () =>
		api.integrate(source, how)
	);
}

export async function renameBranch(name: string): Promise<void> {
	const next = await dialog.prompt({
		title: `Rename ${name}`,
		body: 'Only the local branch is renamed. A remote that already has it keeps the old name.',
		label: 'New name',
		value: name,
		confirmLabel: 'Rename'
	});
	if (next === null || next === name) return;

	await perform(`Renamed ${name} to ${next}`, 'Could not rename the branch', () =>
		api.renameBranch(name, next)
	);
}

/**
 * Delete a local branch.
 *
 * `merged` decides both the wording and whether git is asked to force. An
 * unmerged branch is the case where commits are actually lost, and it says so.
 */
export async function deleteBranch(name: string, merged: boolean): Promise<void> {
	const agreed = await dialog.confirm({
		title: `Delete ${name}`,
		body: merged
			? `Everything on ${name} is already in the branch you have checked out, so nothing is lost.`
			: `${name} has commits that are on no other branch. Deleting it leaves them reachable only through the reflog, until git expires them.`,
		confirmLabel: 'Delete',
		danger: !merged
	});
	if (!agreed) return;

	await perform(`Deleted ${name}`, 'Could not delete the branch', () =>
		api.deleteBranch(name, !merged)
	);
}

export async function deleteTag(name: string): Promise<void> {
	const agreed = await dialog.confirm({
		title: `Delete ${name}`,
		body: 'Only the local tag is removed. A remote that has it keeps it until it is deleted there too.',
		confirmLabel: 'Delete',
		danger: true
	});
	if (!agreed) return;

	await perform(`Deleted ${name}`, 'Could not delete the tag', () => api.deleteTag(name));
}

// --- Stashes ---------------------------------------------------------------

const STASH_WORDING: Record<StashAction, { title: string; body: string; done: string }> = {
	apply: {
		title: 'Apply',
		body: 'The stashed changes are put back into your files and the entry is kept.',
		done: 'Applied'
	},
	pop: {
		title: 'Pop',
		body: 'The stashed changes are put back into your files and the entry is removed.',
		done: 'Popped'
	},
	drop: {
		title: 'Drop',
		body: 'The entry is removed without being restored. It survives in the reflog until git expires it.',
		done: 'Dropped'
	}
};

export async function stash(index: number, name: string, action: StashAction): Promise<void> {
	const wording = STASH_WORDING[action];
	const agreed = await dialog.confirm({
		title: `${wording.title} ${name}`,
		body: wording.body,
		confirmLabel: wording.title,
		danger: action === 'drop'
	});
	if (!agreed) return;

	await perform(`${wording.done} ${name}`, `Could not ${action} ${name}`, () =>
		api.stashAction(index, action)
	);
}

// --- Remotes ---------------------------------------------------------------

export async function fetchAll(): Promise<void> {
	await perform('Fetched', 'Could not fetch', () => api.fetch());
}

export async function pushCurrent(): Promise<void> {
	await perform('Pushed', 'Could not push', () => api.push());
}
