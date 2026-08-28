// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The questions asked before history is rewritten (FEAT-015).
 *
 * A rebase is the most destructive thing Spagitty does: every other write adds
 * something or moves a ref, and this one replaces a run of commits with new
 * ones whose ids nothing else knows. What is asserted here is that the four
 * things the item asked to be named really are named — the branch, the count,
 * what happens to the originals, and how long they last — and that none of the
 * three controls reaches git without a question first.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/rebase/store.svelte', () => ({
	rebase: {
		run: vi.fn(() => Promise.resolve(true)),
		continue: vi.fn(() => Promise.resolve(true)),
		skip: vi.fn(() => Promise.resolve(true)),
		abort: vi.fn(() => Promise.resolve(true)),
		stopped: false,
		runError: null
	}
}));

vi.mock('$lib/ui/notice.svelte', () => ({
	notice: { ok: vi.fn(), failed: vi.fn() }
}));

import { rebase } from '$lib/rebase/store.svelte';
import { dialog } from '$lib/ui/dialog.svelte';
import { abortRebase, continueRebase, runBody, runRebase, skipCommit } from './actions';

const run = vi.mocked(rebase.run);
const abort = vi.mocked(rebase.abort);
const skip = vi.mocked(rebase.skip);

beforeEach(() => {
	vi.clearAllMocks();
	dialog.dismiss();
});

describe('what running a plan will do', () => {
	it('names the branch, the count, and what becomes of the originals', () => {
		const body = runBody('feature/live', 4, 0);

		expect(body).toContain('4 commits');
		expect(body).toContain('feature/live');
		expect(body).toContain('new ids');
		expect(body).toContain('30 days');
	});

	it('has a word for a branch it cannot name', () => {
		// A detached HEAD has no branch, and "commits on  are replaced" is not
		// a sentence.
		expect(runBody('', 1, 0)).toContain('1 commit on this branch');
	});

	it('says separately when the plan drops commits', () => {
		// Dropped commits are not replaced by anything, which is a different
		// loss from being replaced by a commit with a new id.
		const body = runBody('feature/live', 4, 2);
		expect(body).toContain('2 commits are dropped');
		expect(body).toContain('will not be replaced at all');
	});

	it('says nothing about dropping when nothing is dropped', () => {
		expect(runBody('feature/live', 4, 0)).not.toContain('dropped');
	});
});

describe('the gate on Apply', () => {
	it('asks before anything runs, and is painted as destructive', async () => {
		const running = runRebase('feature/live', 3, 0);

		expect(dialog.question?.title).toBe('Rebase 3 commits');
		expect(dialog.question?.danger).toBe(true);
		expect(run).not.toHaveBeenCalled();

		dialog.accept();
		expect(await running).toBe(true);
		expect(run).toHaveBeenCalled();
	});

	it('does nothing when the question is dismissed', async () => {
		const running = runRebase('feature/live', 3, 0);
		dialog.dismiss();

		expect(await running).toBe(false);
		expect(run).not.toHaveBeenCalled();
	});

	it('asks nothing about an empty plan', async () => {
		expect(await runRebase('feature/live', 0, 0)).toBe(false);
		expect(dialog.question).toBeNull();
	});
});

describe('the three ways out of a stop', () => {
	it('continues without asking — it is what the user came back to do', async () => {
		expect(await continueRebase()).toBe(true);
		expect(dialog.question).toBeNull();
		expect(rebase.continue).toHaveBeenCalled();
	});

	it('asks before skipping, because the commit is dropped', async () => {
		const running = skipCommit();

		expect(dialog.question?.title).toBe('Skip this commit');
		expect(dialog.question?.danger).toBe(true);
		expect(skip).not.toHaveBeenCalled();

		dialog.accept();
		await running;
		expect(skip).toHaveBeenCalled();
	});

	it('warns that aborting throws away the resolutions too', async () => {
		// `--abort` is safe for the rebase and not for the work done since it
		// stopped, which is the part nobody expects.
		const running = abortRebase();

		expect(dialog.question?.body).toContain('conflicts resolved since it stopped are thrown away');
		expect(dialog.question?.danger).toBe(true);

		dialog.accept();
		expect(await running).toBe(true);
		expect(abort).toHaveBeenCalled();
	});

	it('does nothing when either question is dismissed', async () => {
		const skipping = skipCommit();
		dialog.dismiss();
		expect(await skipping).toBe(false);

		const aborting = abortRebase();
		dialog.dismiss();
		expect(await aborting).toBe(false);

		expect(skip).not.toHaveBeenCalled();
		expect(abort).not.toHaveBeenCalled();
	});
});
