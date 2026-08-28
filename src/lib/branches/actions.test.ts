// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Deleting and renaming branches, and the questions asked first (FEAT-013).
 *
 * Two things are worth asserting and neither is the git call. The first is the
 * gate: `-D` must never be reached without the user having read what it costs.
 * The second is the sentence, because the recovery instruction is the only
 * thing standing between "the branch is gone" and "the commits are gone" — a
 * warning that says "it is in the reflog" and stops there assumes the reader
 * already knew how to use the reflog, in which case they did not need warning.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BranchRow } from '$lib/types';

vi.mock('$lib/branches/store.svelte', () => ({
	branches: {
		delete: vi.fn(() => Promise.resolve(true)),
		deleteMany: vi.fn(() => Promise.resolve(true)),
		rename: vi.fn(() => Promise.resolve(true))
	}
}));

import { branches } from '$lib/branches/store.svelte';
import { dialog } from '$lib/ui/dialog.svelte';
import {
	deleteBody,
	deleteBranch,
	deleteMerged,
	mergedBranches,
	renameBranch,
	undeletable
} from './actions';

const remove = vi.mocked(branches.delete);
const removeMany = vi.mocked(branches.deleteMany);
const rename = vi.mocked(branches.rename);

function row(name: string, overrides: Partial<BranchRow> = {}): BranchRow {
	return {
		name,
		fullName: `refs/heads/${name}`,
		kind: 'branch',
		current: false,
		id: 'a'.repeat(40),
		short: 'aaaaaaa',
		summary: `tip of ${name}`,
		authorName: 'Ada Lovelace',
		time: 0,
		upstream: null,
		ahead: null,
		behind: null,
		merged: false,
		...overrides
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	dialog.dismiss();
});

describe('what deleting costs', () => {
	it('says nothing is lost when the branch is merged', () => {
		expect(deleteBody('merged/old', true)).toContain('nothing is lost');
	});

	it('names the commands that bring an unmerged branch back', () => {
		// The whole point: not "it is in the reflog", but what to type.
		expect(deleteBody('feature/live', false, 'abc1234')).toContain(
			'git branch feature/live abc1234'
		);
	});

	it('still names the way to find the id when it has none', () => {
		const body = deleteBody('feature/live', false);
		expect(body).toContain('git reflog');
		expect(body).toContain('git branch feature/live <id>');
	});
});

describe('what cannot be deleted here', () => {
	it('refuses the branch that is checked out', () => {
		expect(undeletable(row('main', { current: true }))).toBe(
			'This is the branch you have checked out'
		);
	});

	it('refuses a remote-tracking ref', () => {
		expect(undeletable(row('origin/main', { kind: 'remote' }))).toContain('follows its remote');
	});

	it('allows an ordinary local branch', () => {
		expect(undeletable(row('feature/live'))).toBeNull();
	});

	it('asks nothing and calls nothing for a refused row', async () => {
		expect(await deleteBranch(row('main', { current: true }))).toBe(false);
		expect(dialog.question).toBeNull();
		expect(remove).not.toHaveBeenCalled();
	});
});

describe('deleting one branch', () => {
	it('forces only when the branch is unmerged, and asks first', async () => {
		const running = deleteBranch(row('feature/live'));

		expect(dialog.question?.danger).toBe(true);
		expect(remove).not.toHaveBeenCalled();

		dialog.accept();
		expect(await running).toBe(true);
		expect(remove).toHaveBeenCalledWith('feature/live', true);
	});

	it('does not force a merged branch, and does not paint it as danger', async () => {
		const running = deleteBranch(row('merged/old', { merged: true }));

		expect(dialog.question?.danger).toBe(false);
		dialog.accept();
		await running;

		expect(remove).toHaveBeenCalledWith('merged/old', false);
	});

	it('does nothing when the question is dismissed', async () => {
		const running = deleteBranch(row('feature/live'));
		dialog.dismiss();

		expect(await running).toBe(false);
		expect(remove).not.toHaveBeenCalled();
	});
});

describe('renaming', () => {
	it('asks for the name and says what comes with it', async () => {
		const running = renameBranch(row('feature/live'));

		expect(dialog.question?.kind).toBe('prompt');
		expect(dialog.question?.value).toBe('feature/live');
		expect(dialog.question?.body).toContain('upstream');

		dialog.setDraft('feature/renamed');
		dialog.accept();

		expect(await running).toBe(true);
		expect(rename).toHaveBeenCalledWith('feature/live', 'feature/renamed');
	});

	it('does nothing when the name comes back unchanged', async () => {
		const running = renameBranch(row('feature/live'));
		dialog.accept();

		expect(await running).toBe(false);
		expect(rename).not.toHaveBeenCalled();
	});

	it('does nothing when the prompt is dismissed', async () => {
		const running = renameBranch(row('feature/live'));
		dialog.dismiss();

		expect(await running).toBe(false);
		expect(rename).not.toHaveBeenCalled();
	});

	it('will not rename a remote-tracking ref', async () => {
		expect(await renameBranch(row('origin/main', { kind: 'remote' }))).toBe(false);
		expect(dialog.question).toBeNull();
	});
});

describe('the merged cleanup', () => {
	const rows = [
		row('main', { current: true, merged: true }),
		row('merged/one', { merged: true }),
		row('merged/two', { merged: true }),
		row('feature/live'),
		row('origin/merged', { kind: 'remote', merged: true })
	];

	it('is local, merged, and never the branch you are standing on', () => {
		// The current branch is merged into itself, which is exactly the trap.
		expect(mergedBranches(rows).map((r) => r.name)).toEqual(['merged/one', 'merged/two']);
	});

	it('shows every name in the question rather than a count', async () => {
		const running = deleteMerged(rows);

		expect(dialog.question?.title).toBe('Delete 2 merged branches');
		expect(dialog.question?.body).toContain('merged/one');
		expect(dialog.question?.body).toContain('merged/two');

		dialog.accept();
		await running;
	});

	it('never forces, so a branch that is no longer merged fails instead', async () => {
		// The list is a moment old. Forcing it through would turn a stale read
		// into lost commits.
		const running = deleteMerged(rows);
		dialog.accept();
		await running;

		expect(removeMany).toHaveBeenCalledWith(['merged/one', 'merged/two'], false);
	});

	it('does nothing when the question is dismissed', async () => {
		const running = deleteMerged(rows);
		dialog.dismiss();

		expect(await running).toBe(false);
		expect(removeMany).not.toHaveBeenCalled();
	});

	it('asks nothing when there is nothing merged to clean up', async () => {
		expect(await deleteMerged([row('feature/live')])).toBe(false);
		expect(dialog.question).toBeNull();
	});
});
