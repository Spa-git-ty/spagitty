// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommitDiff, StashEntry } from '$lib/types';

vi.mock('$lib/api', () => ({
	stashes: vi.fn(),
	stashPush: vi.fn(),
	commitDiff: vi.fn()
}));

vi.mock('$lib/repo.svelte', async () => await import('../../testing/repo-store.svelte'));

import * as api from '$lib/api';
import { calls as repoCalls, control as repoControl } from '../../testing/repo-store.svelte';
import { stash } from './store.svelte';

const stashes = vi.mocked(api.stashes);
const stashPush = vi.mocked(api.stashPush);
const commitDiff = vi.mocked(api.commitDiff);

function entry(index: number, overrides: Partial<StashEntry> = {}): StashEntry {
	const id = `${index}`.padStart(40, 'a');
	return {
		index,
		name: `stash@{${index}}`,
		id,
		short: id.slice(0, 7),
		message: `On main: entry ${index}`,
		time: 1_700_000_000 - index * 60,
		authorName: 'Ada Lovelace',
		parent: 'b'.repeat(40),
		parentShort: 'bbbbbbb',
		parentSummary: 'Merge feature/split-view',
		...overrides
	};
}

function diff(id: string): CommitDiff {
	return {
		id,
		short: id.slice(0, 7),
		summary: 'a stash',
		files: [
			{
				path: 'notes.md',
				status: 'modified',
				binary: false,
				tooLarge: false,
				added: 1,
				removed: 0
			}
		],
		added: 1,
		removed: 0
	};
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => (resolve = res));
	return { promise, resolve };
}

beforeEach(() => {
	vi.clearAllMocks();
	stash.clear();
	repoControl.reset();
	stashes.mockResolvedValue([entry(0), entry(1)]);
	commitDiff.mockImplementation((id: string) => Promise.resolve(diff(id)));
	stashPush.mockResolvedValue(undefined);
});

describe('load', () => {
	it('lists the entries and opens the newest', async () => {
		await stash.load();
		await settle();

		expect(stash.entries.map((e) => e.name)).toEqual(['stash@{0}', 'stash@{1}']);
		expect(stash.selected?.index).toBe(0);
		expect(stash.contents?.files).toHaveLength(1);
	});

	it('reads an entry through the commit diff, because a stash is a commit', async () => {
		await stash.load();
		await settle();

		expect(commitDiff).toHaveBeenCalledWith(entry(0).id);
	});

	it('selects nothing when there is no stash', async () => {
		stashes.mockResolvedValueOnce([]);
		await stash.load();
		await settle();

		expect(stash.entries).toEqual([]);
		expect(stash.selected).toBeNull();
		expect(commitDiff).not.toHaveBeenCalled();
	});

	it('records a failure and shows nothing', async () => {
		stashes.mockRejectedValueOnce('could not read refs');
		await stash.load();

		expect(stash.error).toBe('could not read refs');
		expect(stash.entries).toEqual([]);
		expect(stash.selected).toBeNull();
	});

	it('keeps the open entry across a reload when it survived', async () => {
		await stash.load();
		await settle();
		stash.select(entry(1).id);
		await settle();

		await stash.load();
		await settle();

		expect(stash.selected?.index).toBe(1);
	});

	it('falls back to the newest when the open entry is gone', async () => {
		await stash.load();
		await settle();
		stash.select(entry(1).id);
		await settle();

		stashes.mockResolvedValueOnce([entry(0)]);
		await stash.load();
		await settle();

		expect(stash.selected?.index).toBe(0);
	});

	it('drops a slow read that a newer one superseded', async () => {
		const slow = deferred<StashEntry[]>();
		stashes.mockReturnValueOnce(slow.promise);

		const first = stash.load();
		await stash.load();
		slow.resolve([entry(9, { message: 'stale' })]);
		await first;
		await settle();

		expect(stash.entries.map((e) => e.message)).not.toContain('stale');
	});
});

describe('select', () => {
	it('does not re-read an entry that is already open', async () => {
		await stash.load();
		await settle();
		commitDiff.mockClear();

		stash.select(entry(0).id);
		expect(commitDiff).not.toHaveBeenCalled();
	});

	it('records a failure to read an entry without losing the list', async () => {
		await stash.load();
		await settle();

		commitDiff.mockRejectedValueOnce('no commit');
		stash.select(entry(1).id);
		await settle();

		expect(stash.contentsError).toBe('no commit');
		expect(stash.contentsLoading).toBe(false);
		expect(stash.entries).toHaveLength(2);
	});

	it('drops a slow read that a newer selection superseded', async () => {
		await stash.load();
		await settle();

		const slow = deferred<CommitDiff>();
		commitDiff.mockReturnValueOnce(slow.promise);

		stash.select(entry(1).id);
		stash.select(entry(0).id);
		await settle();

		slow.resolve(diff(entry(1).id));
		await settle();

		expect(stash.contents?.id).toBe(entry(0).id);
	});
});

describe('push', () => {
	it('stashes, clears the message and re-reads everything', async () => {
		await stash.load();
		await settle();
		stash.setMessage('wip');
		stashes.mockClear();

		expect(await stash.push()).toBe(true);

		expect(stashPush).toHaveBeenCalledWith('wip', false);
		expect(stash.message).toBe('');
		expect(stashes).toHaveBeenCalled();
		expect(repoCalls.refreshed).toBeGreaterThan(0);
	});

	it('can take untracked files too', async () => {
		await stash.load();
		await settle();
		stash.setIncludeUntracked(true);

		await stash.push();

		expect(stashPush).toHaveBeenCalledWith('', true);
	});

	it('keeps the message when the stash is refused', async () => {
		await stash.load();
		await settle();
		stash.setMessage('wip');
		stashPush.mockRejectedValueOnce('there is nothing to stash');

		expect(await stash.push()).toBe(false);

		expect(stash.message).toBe('wip');
		expect(stash.writeError).toBe('there is nothing to stash');
	});

	it('refuses a second push while one is in flight', async () => {
		await stash.load();
		await settle();
		const slow = deferred<void>();
		stashPush.mockReturnValueOnce(slow.promise);

		const first = stash.push();
		expect(await stash.push()).toBe(false);
		expect(stashPush).toHaveBeenCalledTimes(1);

		slow.resolve();
		await first;
	});
});

describe('clear', () => {
	it('forgets the entries, the selection and the message', async () => {
		await stash.load();
		await settle();
		stash.setMessage('half-typed');
		stash.setIncludeUntracked(true);

		stash.clear();

		expect(stash.entries).toEqual([]);
		expect(stash.loaded).toBe(false);
		expect(stash.selected).toBeNull();
		expect(stash.contents).toBeNull();
		expect(stash.message).toBe('');
		expect(stash.includeUntracked).toBe(false);
	});
});
