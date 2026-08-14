// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommitDiff, FileChange, FileDiff } from '$lib/types';

vi.mock('$lib/api', () => ({
	commitDiff: vi.fn(),
	fileDiff: vi.fn()
}));

import * as api from '$lib/api';
import { diff } from './store.svelte';

const commitDiff = vi.mocked(api.commitDiff);
const fileDiff = vi.mocked(api.fileDiff);

function fileChange(path: string, added = 1, removed = 1): FileChange {
	return { path, status: 'modified', binary: false, tooLarge: false, added, removed };
}

function commit(id: string, paths: string[]): CommitDiff {
	const files = paths.map((p) => fileChange(p));
	return {
		id,
		short: id.slice(0, 7),
		summary: `commit ${id}`,
		files,
		added: files.length,
		removed: files.length
	};
}

function hunks(path: string): FileDiff {
	return {
		path,
		status: 'modified',
		binary: false,
		tooLarge: false,
		added: 1,
		removed: 1,
		hunks: [
			{
				oldStart: 1,
				oldLines: 1,
				newStart: 1,
				newLines: 1,
				header: '@@ -1 +1 @@',
				lines: [
					{ origin: 'removed', old: 1, new: null, text: `old ${path}` },
					{ origin: 'added', old: null, new: 1, text: `new ${path}` }
				]
			}
		]
	};
}

/** Let every already-resolved promise in the store settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A promise plus the handles to settle it later. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

beforeEach(() => {
	vi.resetAllMocks();
	diff.clear();
	commitDiff.mockImplementation((id) => Promise.resolve(commit(id, ['a.txt', 'b.txt', 'c.txt'])));
	fileDiff.mockImplementation((_id, path) => Promise.resolve(hunks(path)));
});

describe('open', () => {
	it('loads the file list and selects the first file', async () => {
		await diff.open('abc');
		await settle();

		expect(diff.commit?.files.map((f) => f.path)).toEqual(['a.txt', 'b.txt', 'c.txt']);
		expect(diff.path).toBe('a.txt');
		expect(diff.file?.hunks).toHaveLength(1);
		expect(diff.error).toBeNull();
	});

	it('does not refetch a commit that is already on screen', async () => {
		await diff.open('abc');
		await settle();
		await diff.open('abc');

		expect(commitDiff).toHaveBeenCalledTimes(1);
	});

	it('does refetch after the commit has been cleared', async () => {
		await diff.open('abc');
		await settle();
		diff.clear();
		await diff.open('abc');

		expect(commitDiff).toHaveBeenCalledTimes(2);
	});

	it('records the error and shows no commit when the load fails', async () => {
		commitDiff.mockRejectedValueOnce('no commit deadbeef');
		await diff.open('deadbeef');

		expect(diff.error).toBe('no commit deadbeef');
		expect(diff.commit).toBeNull();
		expect(diff.loading).toBe(false);
	});

	it('leaves an empty commit with nothing selected rather than fetching a file', async () => {
		commitDiff.mockResolvedValueOnce(commit('empty', []));
		await diff.open('empty');
		await settle();

		expect(diff.count).toBe(0);
		expect(diff.path).toBeNull();
		expect(fileDiff).not.toHaveBeenCalled();
	});

	it('drops a slow commit load that a newer one has superseded', async () => {
		const slow = deferred<CommitDiff>();
		commitDiff.mockReturnValueOnce(slow.promise);

		const first = diff.open('old');
		await diff.open('new');
		await settle();

		slow.resolve(commit('old', ['stale.txt']));
		await first;
		await settle();

		expect(diff.commitId).toBe('new');
		expect(diff.commit?.id).toBe('new');
		expect(diff.commit?.files.map((f) => f.path)).not.toContain('stale.txt');
	});
});

describe('select', () => {
	it('fetches a file once and serves it from the cache afterwards', async () => {
		await diff.open('abc');
		await settle();

		diff.select('b.txt');
		await settle();
		expect(fileDiff).toHaveBeenCalledTimes(2); // a.txt on open, then b.txt

		diff.select('a.txt');
		await settle();
		diff.select('b.txt');
		await settle();
		expect(fileDiff).toHaveBeenCalledTimes(2);
		expect(diff.file?.path).toBe('b.txt');
	});

	it('serves a cached file without a loading flash', async () => {
		await diff.open('abc');
		await settle();
		diff.select('b.txt');
		await settle();

		diff.select('a.txt');
		// Synchronously, before any promise can settle.
		expect(diff.fileLoading).toBe(false);
		expect(diff.file?.path).toBe('a.txt');
	});

	it('throws the cache away when the commit changes', async () => {
		await diff.open('abc');
		await settle();
		expect(fileDiff).toHaveBeenCalledTimes(1);

		diff.clear();
		await diff.open('def');
		await settle();

		// Same path, different commit: it must be fetched again.
		expect(fileDiff).toHaveBeenCalledTimes(2);
	});

	it('records a file error without disturbing the file list', async () => {
		await diff.open('abc');
		await settle();

		fileDiff.mockRejectedValueOnce('no file b.txt in that commit');
		diff.select('b.txt');
		await settle();

		expect(diff.fileError).toBe('no file b.txt in that commit');
		expect(diff.fileLoading).toBe(false);
		expect(diff.commit?.files).toHaveLength(3);
	});

	it('drops a slow file load that a newer selection has superseded', async () => {
		await diff.open('abc');
		await settle();

		const slow = deferred<FileDiff>();
		fileDiff.mockReturnValueOnce(slow.promise);

		diff.select('b.txt');
		diff.select('c.txt');
		await settle();

		slow.resolve(hunks('b.txt'));
		await settle();

		expect(diff.path).toBe('c.txt');
		expect(diff.file?.path).toBe('c.txt');
	});

	it('does nothing when no commit is open', () => {
		diff.select('a.txt');
		expect(diff.path).toBeNull();
		expect(fileDiff).not.toHaveBeenCalled();
	});
});

describe('index and step', () => {
	it('reports the position of the selected file', async () => {
		await diff.open('abc');
		await settle();
		expect(diff.index).toBe(0);
		expect(diff.count).toBe(3);

		diff.select('c.txt');
		expect(diff.index).toBe(2);
	});

	it('reports -1 when nothing is selected', () => {
		expect(diff.index).toBe(-1);
	});

	it('moves through the list', async () => {
		await diff.open('abc');
		await settle();

		diff.step(1);
		expect(diff.path).toBe('b.txt');
		diff.step(-1);
		expect(diff.path).toBe('a.txt');
	});

	it('stops at either end instead of wrapping', async () => {
		await diff.open('abc');
		await settle();

		diff.step(-1);
		expect(diff.path).toBe('a.txt');

		diff.step(10);
		expect(diff.path).toBe('c.txt');
		diff.step(1);
		expect(diff.path).toBe('c.txt');
	});

	it('does nothing on a commit with no files', async () => {
		commitDiff.mockResolvedValueOnce(commit('empty', []));
		await diff.open('empty');
		await settle();

		expect(() => diff.step(1)).not.toThrow();
		expect(diff.path).toBeNull();
	});
});

describe('view', () => {
	function stubStorage() {
		const store = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => void store.set(k, v),
			removeItem: (k: string) => void store.delete(k)
		});
		return store;
	}

	it('defaults to unified', () => {
		expect(diff.view).toBe('unified');
	});

	it('remembers the choice', () => {
		const store = stubStorage();
		diff.setView('split');
		expect(diff.view).toBe('split');
		expect([...store.values()]).toContain('split');

		diff.setView('unified');
		diff.init();
		expect(diff.view).toBe('unified');
	});

	it('restores a stored choice', () => {
		stubStorage();
		diff.setView('split');
		diff.setView('unified');
		// Storage still says split; init is what reads it back.
		localStorage.setItem('gitlord.diffView', 'split');
		diff.init();
		expect(diff.view).toBe('split');
	});

	it('ignores a stored value that is not a view', () => {
		stubStorage();
		diff.setView('unified');
		localStorage.setItem('gitlord.diffView', 'sideways');
		diff.init();
		expect(diff.view).toBe('unified');
	});

	it('survives storage being unavailable', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('denied');
			},
			setItem: () => {
				throw new Error('denied');
			}
		});
		expect(() => diff.init()).not.toThrow();
		expect(() => diff.setView('split')).not.toThrow();
		expect(diff.view).toBe('split');
	});
});

describe('clear', () => {
	it('forgets everything about the open commit', async () => {
		await diff.open('abc');
		await settle();

		diff.clear();

		expect(diff.commitId).toBeNull();
		expect(diff.commit).toBeNull();
		expect(diff.path).toBeNull();
		expect(diff.file).toBeNull();
		expect(diff.error).toBeNull();
		expect(diff.loading).toBe(false);
		expect(diff.count).toBe(0);
		expect(diff.index).toBe(-1);
	});

	it('stops an in-flight load from landing afterwards', async () => {
		const slow = deferred<CommitDiff>();
		commitDiff.mockReturnValueOnce(slow.promise);

		const pending = diff.open('abc');
		diff.clear();
		slow.resolve(commit('abc', ['a.txt']));
		await pending;
		await settle();

		expect(diff.commit).toBeNull();
	});
});
