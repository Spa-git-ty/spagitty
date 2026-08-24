// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The question asked before work is thrown away (FEAT-048).
 *
 * What is asserted here is the wording and the gate, because both are the whole
 * safety mechanism. There is no reflog for the working tree: if the dialog is
 * skipped, or if it says "discard changes" about a file that is actually going
 * to be deleted, the person finds out afterwards and there is nothing to find
 * out *with*.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatusEntry } from '$lib/types';

vi.mock('$lib/changes/store.svelte', () => ({
	changes: {
		work: { staged: [], unstaged: [] as StatusEntry[], conflicted: [] },
		selection: { path: 'b.txt', side: 'unstaged' },
		discard: vi.fn(() => Promise.resolve(true)),
		discardHunk: vi.fn(() => Promise.resolve(true))
	}
}));

import { changes } from '$lib/changes/store.svelte';
import { dialog } from '$lib/ui/dialog.svelte';
import { discardAll, discardBody, discardHunk, discardPaths } from './discard';

const discard = vi.mocked(changes.discard);
const discardHunkCall = vi.mocked(changes.discardHunk);

function entry(path: string, status: StatusEntry['status'] = 'modified'): StatusEntry {
	return { path, status };
}

/** Answer whatever question is open, the way a person clicking would. */
function answer(agreed: boolean): void {
	if (agreed) dialog.accept();
	else dialog.dismiss();
}

beforeEach(() => {
	vi.clearAllMocks();
	dialog.dismiss();
	changes.work.unstaged = [];
});

describe('the sentence', () => {
	it('says the file goes back to what is staged, for a tracked one', () => {
		expect(discardBody([entry('b.txt')])).toBe(
			'The file goes back to what is staged for it. This cannot be undone.'
		);
	});

	it('says an untracked file is deleted, because that is what happens', () => {
		// The distinction the whole module exists for: "discard" means two
		// different things, and only one of them leaves a file behind.
		expect(discardBody([entry('scratch.txt', 'untracked')])).toBe(
			'scratch.txt is not tracked by git, so it is deleted. This cannot be undone.'
		);
	});

	it('says both when the selection is a mix', () => {
		const body = discardBody([entry('b.txt'), entry('scratch.txt', 'untracked')]);
		expect(body).toContain('1 file goes back');
		expect(body).toContain('scratch.txt is not tracked');
	});

	it('counts rather than listing when there are several', () => {
		const body = discardBody([
			entry('a.txt'),
			entry('b.txt'),
			entry('x', 'untracked'),
			entry('y', 'untracked')
		]);
		expect(body).toContain('2 files go back');
		expect(body).toContain('2 untracked files are deleted');
	});

	it('always says it cannot be undone', () => {
		for (const entries of [
			[entry('b.txt')],
			[entry('x', 'untracked')],
			[entry('b.txt'), entry('x', 'untracked')]
		]) {
			expect(discardBody(entries)).toContain('This cannot be undone.');
		}
	});
});

describe('the gate', () => {
	it('asks before anything is thrown away', async () => {
		const running = discardPaths([entry('b.txt')]);
		expect(dialog.question?.title).toBe('Discard changes to b.txt');
		expect(dialog.question?.danger).toBe(true);
		expect(dialog.question?.confirmLabel).toBe('Discard');
		// Nothing has happened yet, and must not have.
		expect(discard).not.toHaveBeenCalled();

		answer(true);
		expect(await running).toBe(true);
		expect(discard).toHaveBeenCalledWith(['b.txt']);
	});

	it('does nothing at all when the question is dismissed', async () => {
		const running = discardPaths([entry('b.txt')]);
		answer(false);

		expect(await running).toBe(false);
		expect(discard).not.toHaveBeenCalled();
	});

	it('names how many files are at stake in the title', async () => {
		const running = discardPaths([entry('a.txt'), entry('b.txt')]);
		expect(dialog.question?.title).toBe('Discard changes to 2 files');
		answer(false);
		await running;
	});

	it('asks nothing when there is nothing to discard', async () => {
		expect(await discardPaths([])).toBe(false);
		expect(dialog.question).toBeNull();
	});
});

describe('discard all', () => {
	it('is every unstaged row, and only those', async () => {
		changes.work.unstaged = [entry('b.txt'), entry('scratch.txt', 'untracked')];

		const running = discardAll();
		expect(dialog.question?.title).toBe('Discard changes to 2 files');
		answer(true);
		await running;

		expect(discard).toHaveBeenCalledWith(['b.txt', 'scratch.txt']);
	});

	it('asks nothing when the unstaged column is empty', async () => {
		expect(await discardAll()).toBe(false);
		expect(dialog.question).toBeNull();
	});
});

describe('discard hunk', () => {
	it('asks, names the file, and says the rest of it is left alone', async () => {
		const running = discardHunk(1, '@@ -11 +11 @@');

		expect(dialog.question?.title).toBe('Discard this hunk');
		expect(dialog.question?.body).toContain('b.txt');
		expect(dialog.question?.body).toContain('The rest of the file is left alone');
		expect(dialog.question?.danger).toBe(true);

		answer(true);
		expect(await running).toBe(true);
		expect(discardHunkCall).toHaveBeenCalledWith(1, '@@ -11 +11 @@');
	});

	it('does nothing when the question is dismissed', async () => {
		const running = discardHunk(0, '@@ -1 +1 @@');
		answer(false);

		expect(await running).toBe(false);
		expect(discardHunkCall).not.toHaveBeenCalled();
	});
});
