// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The three ways out of a reflog entry (FEAT-050).
 *
 * The wording carries the whole ordering argument. Branch-here costs nothing,
 * check-out-here is reversible, and reset-here can lose work that is not in the
 * reflog at all — because uncommitted changes were never in it. That last
 * sentence is the one worth asserting: everything a reset moves *past* is
 * recoverable from this very screen, and the thing that is not is the thing
 * people assume is safe.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReflogEntry } from '$lib/types';

vi.mock('$lib/reflog/store.svelte', () => ({
	reflog: {
		writeError: null as string | null,
		branchAt: vi.fn(() => Promise.resolve(true)),
		checkoutAt: vi.fn(() => Promise.resolve(true)),
		resetTo: vi.fn(() => Promise.resolve(true))
	}
}));

vi.mock('$lib/ui/notice.svelte', () => ({ notice: { ok: vi.fn(), failed: vi.fn() } }));

import { reflog } from '$lib/reflog/store.svelte';
import { dialog } from '$lib/ui/dialog.svelte';
import { branchHere, checkoutHere, resetBody, resetHere, suggestedName } from './actions';

const branchAt = vi.mocked(reflog.branchAt);
const checkoutAt = vi.mocked(reflog.checkoutAt);
const resetTo = vi.mocked(reflog.resetTo);

function entry(overrides: Partial<ReflogEntry> = {}): ReflogEntry {
	return {
		index: 3,
		revision: 'HEAD@{3}',
		before: 'b'.repeat(40),
		beforeShort: 'bbbbbbb',
		after: 'a'.repeat(40),
		afterShort: 'aaaaaaa',
		created: false,
		authorName: 'Ada Lovelace',
		time: 1_800_000_000,
		message: 'reset: moving to HEAD~1',
		operation: 'reset',
		...overrides
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	dialog.dismiss();
});

describe('branching at an entry', () => {
	it('suggests a name nobody has to invent', () => {
		expect(suggestedName(entry())).toBe('recovered/aaaaaaa');
	});

	it('promises that nothing existing is moved', async () => {
		// The one recovery that cannot cost anything, and the dialog says so
		// rather than being merely un-scary.
		const running = branchHere(entry());

		expect(dialog.question?.kind).toBe('prompt');
		expect(dialog.question?.title).toBe('Branch at HEAD@{3}');
		expect(dialog.question?.body).toContain('Nothing that exists now is moved or lost');
		expect(dialog.question?.value).toBe('recovered/aaaaaaa');

		dialog.accept();
		expect(await running).toBe(true);
		expect(branchAt).toHaveBeenCalledWith('recovered/aaaaaaa', 'a'.repeat(40));
	});

	it('does nothing when dismissed', async () => {
		const running = branchHere(entry());
		dialog.dismiss();

		expect(await running).toBe(false);
		expect(branchAt).not.toHaveBeenCalled();
	});
});

describe('checking out an entry', () => {
	it('says the head will be detached, and how to get back', async () => {
		const running = checkoutHere(entry());

		expect(dialog.question?.body).toContain('no branch attached');
		expect(dialog.question?.body).toContain('puts everything back');
		// Not destructive: checking out a branch again undoes it.
		expect(dialog.question?.danger).toBe(false);

		dialog.accept();
		expect(await running).toBe(true);
		expect(checkoutAt).toHaveBeenCalledWith('a'.repeat(40));
	});
});

describe('resetting to an entry', () => {
	it('says the commits it moves past are still recoverable here', () => {
		expect(resetBody(entry())).toContain('still in this reflog');
	});

	it('says uncommitted work is the thing that is not', () => {
		// The important half. Everything else on this screen is recoverable
		// from this screen; the working tree never was.
		expect(resetBody(entry())).toContain('not in any reflog and will be lost');
	});

	it('asks first, and is the only one painted as destructive', async () => {
		const running = resetHere(entry());

		expect(dialog.question?.title).toBe('Reset to HEAD@{3}');
		expect(dialog.question?.danger).toBe(true);
		expect(resetTo).not.toHaveBeenCalled();

		dialog.accept();
		expect(await running).toBe(true);
		expect(resetTo).toHaveBeenCalledWith('a'.repeat(40));
	});

	it('does nothing when dismissed', async () => {
		const running = resetHere(entry());
		dialog.dismiss();

		expect(await running).toBe(false);
		expect(resetTo).not.toHaveBeenCalled();
	});
});
