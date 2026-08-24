// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
	ConflictFile,
	ConflictRegion,
	ConflictSide,
	ConflictSides,
	ConflictState
} from '$lib/types';

vi.mock('$lib/api', () => ({
	conflicts: vi.fn(),
	conflictSides: vi.fn(),
	conflictRegions: vi.fn(),
	conflictTake: vi.fn(),
	conflictResolveRegion: vi.fn(),
	conflictWrite: vi.fn(),
	conflictResolve: vi.fn(),
	conflictContinue: vi.fn(),
	conflictAbort: vi.fn()
}));

import * as api from '$lib/api';
import { conflicts, missingSideReason } from './store.svelte';

const listCall = vi.mocked(api.conflicts);
const sidesCall = vi.mocked(api.conflictSides);
const regionsCall = vi.mocked(api.conflictRegions);
const takeCall = vi.mocked(api.conflictTake);
const resolveRegionCall = vi.mocked(api.conflictResolveRegion);
const writeCall = vi.mocked(api.conflictWrite);
const resolveCall = vi.mocked(api.conflictResolve);
const continueCall = vi.mocked(api.conflictContinue);
const abortCall = vi.mocked(api.conflictAbort);

/** The one region the default `sides()` merged text contains. */
function region(overrides: Partial<ConflictRegion> = {}): ConflictRegion {
	return {
		index: 0,
		startLine: 2,
		endLine: 6,
		ours: 'OURS\n',
		base: null,
		theirs: 'THEIRS\n',
		...overrides
	};
}

function file(path: string, kind: ConflictFile['kind'] = 'bothModified'): ConflictFile {
	return { path, kind };
}

function side(text: string, overrides: Partial<ConflictSide> = {}): ConflictSide {
	return {
		text,
		lines: text === '' ? 0 : text.replace(/\n$/, '').split('\n').length,
		bytes: text.length,
		binary: false,
		tooLarge: false,
		...overrides
	};
}

function sides(path: string, overrides: Partial<ConflictSides> = {}): ConflictSides {
	return {
		path,
		kind: 'bothModified',
		base: side('one\ntwo\nthree\n'),
		ours: side('one\nOURS\nthree\n'),
		theirs: side('one\nTHEIRS\nthree\n'),
		merged: side('one\n<<<<<<< HEAD\nOURS\n=======\nTHEIRS\n>>>>>>> theirs\nthree\n'),
		...overrides
	};
}

function state(overrides: Partial<ConflictState> = {}): ConflictState {
	return { operation: 'merge', files: [file('shared.txt')], ...overrides };
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => (resolve = res));
	return { promise, resolve };
}

beforeEach(() => {
	vi.clearAllMocks();
	conflicts.clear();
	listCall.mockResolvedValue(state());
	sidesCall.mockImplementation((path: string) => Promise.resolve(sides(path)));
	regionsCall.mockResolvedValue([region()]);
	takeCall.mockResolvedValue(undefined);
	resolveRegionCall.mockResolvedValue(undefined);
	writeCall.mockResolvedValue(undefined);
	resolveCall.mockResolvedValue(undefined);
	continueCall.mockResolvedValue(undefined);
	abortCall.mockResolvedValue(undefined);
});

describe('load', () => {
	it('takes the operation and the files the repository reported', async () => {
		await conflicts.load();

		expect(conflicts.operation).toBe('merge');
		expect(conflicts.files.map((f) => f.path)).toEqual(['shared.txt']);
		expect(conflicts.loaded).toBe(true);
	});

	it('opens the first conflicted file without being asked', async () => {
		// Landing on a screen that lists three conflicts and shows none of them
		// makes the user click before the screen has said anything.
		await conflicts.load();

		expect(conflicts.openPath).toBe('shared.txt');
		expect(conflicts.sides?.ours?.text).toContain('OURS');
	});

	it('records a failure and shows nothing', async () => {
		listCall.mockRejectedValue(new Error('no repository is open'));

		await conflicts.load();

		expect(conflicts.error).toContain('no repository is open');
		expect(conflicts.files).toEqual([]);
		expect(conflicts.operation).toBe('none');
	});

	it('drops a slow read that a newer one superseded', async () => {
		const slow = deferred<ConflictState>();
		listCall.mockReturnValueOnce(slow.promise);

		const first = conflicts.load();
		listCall.mockResolvedValue(state({ files: [file('newer.txt')] }));
		await conflicts.load();
		slow.resolve(state({ files: [file('stale.txt')] }));
		await first;

		expect(conflicts.files.map((f) => f.path)).toEqual(['newer.txt']);
	});

	it('reports the operation by the name the user would type', async () => {
		listCall.mockResolvedValue(state({ operation: 'cherryPick' }));

		await conflicts.load();

		expect(conflicts.operationLabel).toBe('cherry-pick');
	});

	it('a repository with conflicts and nothing running says so honestly', async () => {
		// An unresolved index outlives the command that made it. Picking the
		// likeliest operation would send someone to the wrong way out.
		listCall.mockResolvedValue(state({ operation: 'none' }));

		await conflicts.load();

		expect(conflicts.operation).toBe('none');
		expect(conflicts.files).toHaveLength(1);
	});
});

describe('selection', () => {
	beforeEach(() => {
		listCall.mockResolvedValue(
			state({ files: [file('a.txt'), file('b.txt'), file('c.txt')] })
		);
	});

	it('reads the sides of the file it opens', async () => {
		await conflicts.load();
		await conflicts.select('b.txt');

		expect(conflicts.openPath).toBe('b.txt');
		expect(conflicts.sides?.path).toBe('b.txt');
	});

	it('does not re-read the file that is already open', async () => {
		await conflicts.load();
		sidesCall.mockClear();

		await conflicts.select('a.txt');

		expect(sidesCall).not.toHaveBeenCalled();
	});

	it('drops a superseded read of one file over another', async () => {
		await conflicts.load();
		const slow = deferred<ConflictSides>();
		sidesCall.mockReturnValueOnce(slow.promise);

		const first = conflicts.select('b.txt');
		await conflicts.select('c.txt');
		slow.resolve(sides('b.txt'));
		await first;

		expect(conflicts.sides?.path).toBe('c.txt');
	});

	it('a failed read of one file leaves the list intact', async () => {
		await conflicts.load();
		sidesCall.mockRejectedValueOnce(new Error('no file b.txt in that commit'));

		await conflicts.select('b.txt');

		expect(conflicts.sidesError).toContain('no file b.txt');
		expect(conflicts.sides).toBeNull();
		expect(conflicts.files).toHaveLength(3);
	});

	it('steps forward and back without wrapping at the ends', async () => {
		await conflicts.load();

		await conflicts.step(-1);
		expect(conflicts.openPath).toBe('a.txt');

		await conflicts.step(1);
		expect(conflicts.openPath).toBe('b.txt');

		await conflicts.step(1);
		await conflicts.step(1);
		expect(conflicts.openPath).toBe('c.txt');
	});

	it('reports where in the pager the open file sits', async () => {
		await conflicts.load();
		await conflicts.select('c.txt');

		expect(conflicts.position).toBe(3);
	});

	it('keeps the open file across a reload when it is still conflicted', async () => {
		await conflicts.load();
		await conflicts.select('c.txt');

		await conflicts.load();

		expect(conflicts.openPath).toBe('c.txt');
	});

	it('falls back to the first file when the open one was resolved elsewhere', async () => {
		// Staying on it would show three sides of a file that is no longer
		// conflicted at all.
		await conflicts.load();
		await conflicts.select('c.txt');

		listCall.mockResolvedValue(state({ files: [file('a.txt'), file('b.txt')] }));
		await conflicts.load();

		expect(conflicts.openPath).toBe('a.txt');
	});

	it('a repository with nothing conflicted holds no selection', async () => {
		listCall.mockResolvedValue(state({ operation: 'none', files: [] }));

		await conflicts.load();

		expect(conflicts.openPath).toBeNull();
		expect(conflicts.sides).toBeNull();
		expect(conflicts.position).toBe(0);
	});
});

describe('missing sides', () => {
	it('names why a side is missing rather than leaving a blank pane', () => {
		expect(missingSideReason('bothAdded', 'base')).toContain('both sides added');
		expect(missingSideReason('deletedByUs', 'ours')).toBe('Deleted on this side.');
		expect(missingSideReason('deletedByThem', 'theirs')).toBe(
			'Deleted on the incoming side.'
		);
	});

	it('falls back to a plain statement for a side that is simply absent', () => {
		expect(missingSideReason('bothModified', 'base')).toBe('Not present on this side.');
	});

	it('carries a missing side through as null rather than an empty one', async () => {
		// "Deleted on that side" and "emptied on that side" are different, and
		// the second one loses work if acted on.
		sidesCall.mockResolvedValue(
			sides('gone.txt', { kind: 'deletedByThem', theirs: null })
		);
		listCall.mockResolvedValue(state({ files: [file('gone.txt', 'deletedByThem')] }));

		await conflicts.load();

		expect(conflicts.sides?.theirs).toBeNull();
		expect(conflicts.sides?.ours).not.toBeNull();
	});
});

describe('clear', () => {
	it('forgets everything it had read', async () => {
		await conflicts.load();

		conflicts.clear();

		expect(conflicts.files).toEqual([]);
		expect(conflicts.openPath).toBeNull();
		expect(conflicts.sides).toBeNull();
		expect(conflicts.loaded).toBe(false);
		expect(conflicts.operation).toBe('none');
	});
});

describe('taking a side', () => {
	it('takes the whole file and re-reads what that changed', async () => {
		await conflicts.load();
		listCall.mockClear();

		expect(await conflicts.take('theirs')).toBe(true);

		expect(takeCall).toHaveBeenCalledWith('shared.txt', 'theirs');
		// Taking a side does not mark it resolved, so the list is re-read to
		// find out what actually moved.
		expect(listCall).toHaveBeenCalled();
	});

	it('does nothing with no file open', async () => {
		expect(await conflicts.take('ours')).toBe(false);
		expect(takeCall).not.toHaveBeenCalled();
	});

	it('surfaces a refusal rather than pretending it worked', async () => {
		await conflicts.load();
		takeCall.mockRejectedValueOnce(new Error('pathspec did not match'));

		expect(await conflicts.take('ours')).toBe(false);
		expect(conflicts.writeError).toContain('pathspec did not match');
	});
});

describe('resolving one region', () => {
	it('names the region by index and the side by name', async () => {
		await conflicts.load();

		expect(await conflicts.resolveRegion(0, 'ours')).toBe(true);
		expect(resolveRegionCall).toHaveBeenCalledWith('shared.txt', 0, 'ours');
	});

	it('resolves every region when the index is null', async () => {
		await conflicts.load();

		await conflicts.resolveRegion(null, 'theirs');
		expect(resolveRegionCall).toHaveBeenCalledWith('shared.txt', null, 'theirs');
	});

	it('saves a dirty draft first, so the regions match the text on disk', async () => {
		// The indexes the screen is pointing at belong to the text it is showing.
		// Resolving against a file that does not contain that text would take
		// the wrong lines.
		await conflicts.load();
		conflicts.edit();
		conflicts.setDraft('edited\n<<<<<<< HEAD\nOURS\n=======\nTHEIRS\n>>>>>>> theirs\n');

		await conflicts.resolveRegion(0, 'ours');

		expect(writeCall).toHaveBeenCalled();
		expect(writeCall.mock.invocationCallOrder[0]).toBeLessThan(
			resolveRegionCall.mock.invocationCallOrder[0]
		);
	});

	it('does not resolve at all when saving the draft failed', async () => {
		await conflicts.load();
		conflicts.edit();
		conflicts.setDraft('something else\n');
		writeCall.mockRejectedValueOnce(new Error('permission denied'));

		expect(await conflicts.resolveRegion(0, 'ours')).toBe(false);
		expect(resolveRegionCall).not.toHaveBeenCalled();
	});
});

describe('the draft', () => {
	it('starts from what is on disk and is not dirty until it changes', async () => {
		await conflicts.load();

		conflicts.edit();

		expect(conflicts.draft).toBe(conflicts.sides?.merged?.text);
		expect(conflicts.dirty).toBe(false);
	});

	it('is dirty once the text differs', async () => {
		await conflicts.load();
		conflicts.edit();
		conflicts.setDraft('resolved by hand\n');

		expect(conflicts.dirty).toBe(true);
	});

	it('writes exactly what was typed, and stops being a draft', async () => {
		await conflicts.load();
		conflicts.edit();
		conflicts.setDraft('resolved by hand\n');

		expect(await conflicts.save()).toBe(true);

		expect(writeCall).toHaveBeenCalledWith('shared.txt', 'resolved by hand\n');
		expect(conflicts.draft).toBeNull();
	});

	it('keeps the draft when the write failed', async () => {
		// Losing an edit because the disk refused it is the one outcome worse
		// than the write failing.
		await conflicts.load();
		conflicts.edit();
		conflicts.setDraft('resolved by hand\n');
		writeCall.mockRejectedValueOnce(new Error('read-only file system'));

		expect(await conflicts.save()).toBe(false);
		expect(conflicts.draft).toBe('resolved by hand\n');
	});

	it('refuses to move to another file while it is dirty', async () => {
		// The silent discard the item named as the thing not to do.
		listCall.mockResolvedValue(state({ files: [file('shared.txt'), file('other.txt')] }));
		await conflicts.load();
		conflicts.edit();
		conflicts.setDraft('half finished\n');

		await conflicts.select('other.txt');

		expect(conflicts.openPath).toBe('shared.txt');
		expect(conflicts.draft).toBe('half finished\n');
	});

	it('moves when the caller says the user has answered', async () => {
		listCall.mockResolvedValue(state({ files: [file('shared.txt'), file('other.txt')] }));
		await conflicts.load();
		conflicts.edit();
		conflicts.setDraft('half finished\n');

		await conflicts.select('other.txt', true);

		expect(conflicts.openPath).toBe('other.txt');
		expect(conflicts.draft).toBeNull();
	});

	it('survives a plain reload of the file it belongs to', async () => {
		// Refresh must not be a way to lose an edit.
		await conflicts.load();
		conflicts.edit();
		conflicts.setDraft('half finished\n');

		await conflicts.load();

		expect(conflicts.draft).toBe('half finished\n');
	});

	it('is dropped by taking a side, which replaces the file anyway', async () => {
		await conflicts.load();
		conflicts.edit();
		conflicts.setDraft('half finished\n');

		await conflicts.take('ours');

		expect(conflicts.draft).toBeNull();
	});
});

describe('finishing', () => {
	it('marks the open file resolved', async () => {
		await conflicts.load();

		expect(await conflicts.markResolved()).toBe(true);
		expect(resolveCall).toHaveBeenCalledWith(['shared.txt']);
	});

	it('knows when everything is resolved and something is still in progress', async () => {
		listCall.mockResolvedValue(state({ files: [] }));
		await conflicts.load();

		expect(conflicts.allResolved).toBe(true);
	});

	it('is not "all resolved" when nothing was in progress to begin with', async () => {
		listCall.mockResolvedValue(state({ operation: 'none', files: [] }));
		await conflicts.load();

		expect(conflicts.allResolved).toBe(false);
	});

	it('continues and aborts, re-reading afterwards either way', async () => {
		await conflicts.load();
		listCall.mockClear();

		await conflicts.continue();
		expect(continueCall).toHaveBeenCalled();
		expect(listCall).toHaveBeenCalled();

		await conflicts.abort();
		expect(abortCall).toHaveBeenCalled();
	});

	it('surfaces git’s refusal to continue', async () => {
		await conflicts.load();
		continueCall.mockRejectedValueOnce(new Error('you have unmerged paths'));

		expect(await conflicts.continue()).toBe(false);
		expect(conflicts.writeError).toContain('unmerged paths');
	});
});
