// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The reflog store (FEAT-050).
 *
 * Two things here are worth pinning. The first is that "this ref keeps no
 * reflog" and "this ref has not moved" are different states with different
 * sentences — collapsing them would tell someone to wait for entries that are
 * never coming. The second is that every recovery re-reads: creating a branch,
 * checking out and resetting are all themselves moves, so the list afterwards
 * is not the list before plus nothing.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reflog, ReflogEntry } from '$lib/types';

vi.mock('$lib/api', () => ({
	inTauri: () => true,
	reflog: vi.fn(),
	reflogRefs: vi.fn(),
	createBranch: vi.fn(),
	checkoutDetached: vi.fn(),
	reset: vi.fn()
}));

vi.mock('$lib/repo.svelte', async () => await import('../../testing/repo-store.svelte'));

import * as api from '$lib/api';
import { calls as repoCalls, control as repoControl } from '../../testing/repo-store.svelte';
import { reflog } from './store.svelte';

const read = vi.mocked(api.reflog);
const refs = vi.mocked(api.reflogRefs);
const createBranch = vi.mocked(api.createBranch);
const checkoutDetached = vi.mocked(api.checkoutDetached);
const reset = vi.mocked(api.reset);

function entry(index: number, overrides: Partial<ReflogEntry> = {}): ReflogEntry {
	return {
		index,
		revision: `HEAD@{${index}}`,
		before: 'b'.repeat(40),
		beforeShort: 'bbbbbbb',
		after: 'a'.repeat(40),
		afterShort: 'aaaaaaa',
		created: false,
		authorName: 'Ada Lovelace',
		time: 1_800_000_000 - index,
		message: `commit: change ${index}`,
		operation: 'commit',
		...overrides
	};
}

function log(overrides: Partial<Reflog> = {}): Reflog {
	return {
		reference: 'HEAD',
		entries: [entry(0), entry(1)],
		truncated: false,
		exists: true,
		...overrides
	};
}

function openRepository() {
	repoControl.setInfo({
		path: '/repos/fixture',
		name: 'fixture',
		bare: false,
		head: { branch: 'main', detached: false, id: 'a'.repeat(40), short: 'aaaaaaa' },
		lastFetched: null
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	reflog.clear();
	repoControl.reset();
	openRepository();
	read.mockResolvedValue(log());
	refs.mockResolvedValue(['HEAD', 'main']);
	createBranch.mockResolvedValue(undefined);
	checkoutDetached.mockResolvedValue(undefined);
	reset.mockResolvedValue(undefined);
});

describe('reading', () => {
	it('takes the entries and the refs together', async () => {
		await reflog.load();

		expect(reflog.entries).toHaveLength(2);
		expect(reflog.refs).toEqual(['HEAD', 'main']);
		expect(reflog.loaded).toBe(true);
	});

	it('asks about HEAD until told otherwise', async () => {
		// HEAD's log records checkouts as well as moves, which is what answers
		// "what did I just do".
		await reflog.load();

		expect(read).toHaveBeenCalledWith('', 500);
	});

	it('switches to a branch’s own log', async () => {
		await reflog.show('refs/heads/main');

		expect(read).toHaveBeenLastCalledWith('refs/heads/main', 500);
		expect(reflog.reference).toBe('refs/heads/main');
	});

	it('reports nothing rather than failing with no repository open', async () => {
		repoControl.reset();
		await reflog.load();

		expect(reflog.log).toBeNull();
		expect(reflog.error).toBeNull();
		expect(reflog.loaded).toBe(true);
	});

	it('surfaces a read that failed', async () => {
		read.mockRejectedValueOnce(new Error('no such ref'));
		await reflog.load();

		expect(reflog.error).toContain('no such ref');
	});
});

describe('a ref with nothing to show', () => {
	it('tells "keeps no reflog" apart from "has not moved"', async () => {
		// The first is permanent and the second is not, and a screen that
		// collapsed them would tell someone to wait for entries never coming.
		read.mockResolvedValue(log({ entries: [], exists: false }));
		await reflog.load();

		expect(reflog.absent).toBe(true);

		read.mockResolvedValue(log({ entries: [], exists: true }));
		await reflog.load();

		expect(reflog.absent).toBe(false);
		expect(reflog.entries).toEqual([]);
	});
});

describe('the filter', () => {
	beforeEach(async () => {
		read.mockResolvedValue(
			log({
				entries: [
					entry(0, { operation: 'rebase', message: 'rebase (finish): returning' }),
					entry(1, { operation: 'commit', message: 'commit: add the thing' }),
					entry(2, { operation: 'reset', message: 'reset: moving to HEAD~1' })
				]
			})
		);
		await reflog.load();
	});

	it('matches the operation', () => {
		reflog.setQuery('reset');

		expect(reflog.entries.map((e) => e.operation)).toEqual(['reset']);
		expect(reflog.hidden).toBe(2);
	});

	it('matches the message as well, and ignores case', () => {
		reflog.setQuery('THE THING');

		expect(reflog.entries).toHaveLength(1);
		expect(reflog.entries[0].operation).toBe('commit');
	});

	it('shows everything again when it is cleared', () => {
		reflog.setQuery('reset');
		reflog.setQuery('   ');

		expect(reflog.entries).toHaveLength(3);
		expect(reflog.hidden).toBe(0);
	});
});

describe('recovering from an entry', () => {
	beforeEach(async () => {
		await reflog.load();
	});

	it('creates a branch at the entry without checking it out', async () => {
		// The recovery that cannot cost anything: a new ref, nothing moved.
		expect(await reflog.branchAt('recovered/aaaaaaa', 'a'.repeat(40))).toBe(true);

		expect(createBranch).toHaveBeenCalledWith('recovered/aaaaaaa', 'a'.repeat(40), false);
	});

	it('trims the name and refuses an empty one', async () => {
		await reflog.branchAt('  spaced  ', 'a'.repeat(40));
		expect(createBranch).toHaveBeenCalledWith('spaced', 'a'.repeat(40), false);

		createBranch.mockClear();
		expect(await reflog.branchAt('   ', 'a'.repeat(40))).toBe(false);
		expect(createBranch).not.toHaveBeenCalled();
	});

	it('checks out an entry detached', async () => {
		await reflog.checkoutAt('a'.repeat(40));
		expect(checkoutDetached).toHaveBeenCalledWith('a'.repeat(40));
	});

	it('resets hard, never any softer', async () => {
		// A softer reset would leave the working tree describing a commit that
		// is no longer checked out, which is not what "go back to here" means.
		await reflog.resetTo('a'.repeat(40));
		expect(reset).toHaveBeenCalledWith('a'.repeat(40), 'hard');
	});

	it('re-reads afterwards, because recovering is itself a move', async () => {
		read.mockClear();
		await reflog.branchAt('recovered', 'a'.repeat(40));

		expect(read).toHaveBeenCalled();
		expect(repoCalls.refreshed).toBeGreaterThan(0);
	});

	it('surfaces a refusal rather than pretending it worked', async () => {
		createBranch.mockRejectedValueOnce(new Error('a branch named recovered already exists'));

		expect(await reflog.branchAt('recovered', 'a'.repeat(40))).toBe(false);
		expect(reflog.writeError).toContain('already exists');
	});
});
