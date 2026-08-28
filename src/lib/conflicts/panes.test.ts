// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { click, render } from '../../testing/mount';
import type { ConflictFile, ConflictSide, ConflictSides, ConflictState } from '$lib/types';

vi.mock('$lib/api', () => ({
	conflicts: vi.fn(),
	conflictSides: vi.fn(),
	conflictRegions: vi.fn(() => Promise.resolve([])),
	conflictTake: vi.fn(() => Promise.resolve()),
	conflictResolveRegion: vi.fn(() => Promise.resolve()),
	conflictWrite: vi.fn(() => Promise.resolve()),
	conflictResolve: vi.fn(() => Promise.resolve()),
	conflictContinue: vi.fn(() => Promise.resolve()),
	conflictAbort: vi.fn(() => Promise.resolve())
}));

import * as api from '$lib/api';
import ConflictPager from './ConflictPager.svelte';
import ResolveBar from './ResolveBar.svelte';
import SidePane from './SidePane.svelte';
import { conflicts } from './store.svelte';

const listCall = vi.mocked(api.conflicts);
const sidesCall = vi.mocked(api.conflictSides);
const regionsCall = vi.mocked(api.conflictRegions);
const takeCall = vi.mocked(api.conflictTake);
const resolveRegionCall = vi.mocked(api.conflictResolveRegion);

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

function file(path: string, kind: ConflictFile['kind'] = 'bothModified'): ConflictFile {
	return { path, kind };
}

function sidesFor(path: string): ConflictSides {
	return {
		path,
		kind: 'bothModified',
		base: side('one\ntwo\n'),
		ours: side('one\nOURS\n'),
		theirs: side('one\nTHEIRS\n'),
		merged: side('one\n<<<<<<< HEAD\nOURS\n=======\nTHEIRS\n>>>>>>> theirs\n')
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	conflicts.clear();
	listCall.mockResolvedValue({
		operation: 'merge',
		files: [file('src/a.txt'), file('b.txt')]
	} satisfies ConflictState);
	sidesCall.mockImplementation((path: string) => Promise.resolve(sidesFor(path)));
	regionsCall.mockResolvedValue([
		{ index: 0, startLine: 2, endLine: 6, ours: 'OURS\n', base: null, theirs: 'THEIRS\n' }
	]);
});

describe('SidePane', () => {
	it('renders a side line by line, with its line count', () => {
		const view = render(SidePane, {
			title: 'Ours',
			subtitle: 'HEAD',
			side: side('one\nOURS\nthree\n'),
			which: 'ours' as const,
			kind: 'bothModified' as const
		});

		expect(view.all('.lines li')).toHaveLength(3);
		expect(view.text()).toContain('3 lines');
		view.destroy();
	});

	it('marks the conflict markers so the merged pane reads as the worked-on one', () => {
		const view = render(SidePane, {
			title: 'Merged result',
			subtitle: 'on disk, with markers',
			side: side('one\n<<<<<<< HEAD\nOURS\n=======\nTHEIRS\n>>>>>>> theirs\n'),
			which: 'merged' as const,
			kind: 'bothModified' as const,
			middle: true
		});

		expect(view.all('.lines li.marker')).toHaveLength(3);
		view.destroy();
	});

	it('says a missing side was deleted rather than drawing it empty', () => {
		// An empty pane reads as "they emptied the file", which is a different
		// thing and one that loses work if acted on.
		const view = render(SidePane, {
			title: 'Theirs',
			subtitle: 'the incoming side',
			side: null,
			which: 'theirs' as const,
			kind: 'deletedByThem' as const
		});

		expect(view.text()).toContain('Deleted on the incoming side');
		expect(view.all('.lines li')).toHaveLength(0);
		view.destroy();
	});

	it('says there is no common ancestor when both sides added the file', () => {
		const view = render(SidePane, {
			title: 'Base',
			subtitle: 'what both sides started from',
			side: null,
			which: 'base' as const,
			kind: 'bothAdded' as const
		});

		expect(view.text()).toContain('both sides added');
		view.destroy();
	});

	it('names a binary side and its size instead of decoding it', () => {
		const view = render(SidePane, {
			title: 'Ours',
			subtitle: 'HEAD',
			side: side('', { binary: true, bytes: 74 }),
			which: 'ours' as const,
			kind: 'bothModified' as const
		});

		expect(view.text()).toContain('Binary');
		expect(view.text()).toContain('74 bytes');
		view.destroy();
	});

	it('says a side is too large rather than trying to draw it', () => {
		const view = render(SidePane, {
			title: 'Ours',
			subtitle: 'HEAD',
			side: side('', { tooLarge: true, bytes: 9_000_000 }),
			which: 'ours' as const,
			kind: 'bothModified' as const
		});

		expect(view.text()).toContain('too large');
		view.destroy();
	});

	it('distinguishes an empty side from a missing one', () => {
		const view = render(SidePane, {
			title: 'Ours',
			subtitle: 'HEAD',
			side: side(''),
			which: 'ours' as const,
			kind: 'bothModified' as const
		});

		expect(view.text()).toContain('Empty on this side');
		view.destroy();
	});

	it('a merged pane with no file on disk says so in its own words', () => {
		const view = render(SidePane, {
			title: 'Merged result',
			subtitle: 'on disk, with markers',
			side: null,
			which: 'merged' as const,
			kind: 'deletedByThem' as const
		});

		expect(view.text()).toContain('No file on disk');
		view.destroy();
	});
});

describe('ConflictPager', () => {
	it('shows one chip per conflicted file, named by its file name', async () => {
		await conflicts.load();
		const view = render(ConflictPager, {});

		const chips = view.all('.files .chip');
		expect(chips.map((chip) => chip.textContent?.trim())).toEqual(['a.txt', 'b.txt']);
		view.destroy();
	});

	it('carries the full path and the kind of conflict in each chip title', async () => {
		listCall.mockResolvedValue({
			operation: 'merge',
			files: [file('src/gone.txt', 'deletedByThem')]
		});
		await conflicts.load();
		const view = render(ConflictPager, {});

		expect(view.get('.files .chip').title).toBe('src/gone.txt — they deleted');
		view.destroy();
	});

	it('marks the open file and opens another when its chip is clicked', async () => {
		await conflicts.load();
		const view = render(ConflictPager, {});

		expect(view.all('.files .chip.active').map((c) => c.textContent?.trim())).toEqual([
			'a.txt'
		]);

		click(view.all('.files .chip')[1]);
		await Promise.resolve();

		expect(conflicts.openPath).toBe('b.txt');
		view.destroy();
	});

	it('says where in the list the open file sits', async () => {
		await conflicts.load();
		const view = render(ConflictPager, {});

		expect(view.text()).toContain('1 of 2');
		view.destroy();
	});

	it('disables Previous on the first file and Next on the last', async () => {
		await conflicts.load();
		const view = render(ConflictPager, {});

		const [previous, next] = view.all('.steps button') as HTMLButtonElement[];
		expect(previous.disabled).toBe(true);
		expect(next.disabled).toBe(false);

		await conflicts.select('b.txt');
		view.destroy();

		const later = render(ConflictPager, {});
		const buttons = later.all('.steps button') as HTMLButtonElement[];
		expect(buttons[0].disabled).toBe(false);
		expect(buttons[1].disabled).toBe(true);
		later.destroy();
	});
});

describe('the merged pane while it is being edited', () => {
	it('is text until Edit, and a textarea after it', async () => {
		await conflicts.load();

		const reading = render(SidePane, {
			title: 'Merged result',
			subtitle: 'on disk',
			side: sidesFor('src/a.txt').merged,
			which: 'merged' as const,
			kind: 'bothModified' as const,
			middle: true
		});
		expect(reading.all('.editor')).toHaveLength(0);
		reading.destroy();

		conflicts.edit();
		const editing = render(SidePane, {
			title: 'Merged result',
			subtitle: 'on disk',
			side: sidesFor('src/a.txt').merged,
			which: 'merged' as const,
			kind: 'bothModified' as const,
			middle: true
		});
		// Exactly what will be on disk afterwards — no line numbers, no
		// decoration between what is typed and what is written.
		expect(editing.get('.editor').tagName).toBe('TEXTAREA');
		expect((editing.get('.editor') as HTMLTextAreaElement).value).toBe(conflicts.draft);
		editing.destroy();
	});

	it('never turns another side into an editor', async () => {
		await conflicts.load();
		conflicts.edit();

		const view = render(SidePane, {
			title: 'Ours',
			subtitle: 'HEAD',
			side: side('one\nOURS\n'),
			which: 'ours' as const,
			kind: 'bothModified' as const
		});

		expect(view.all('.editor')).toHaveLength(0);
		view.destroy();
	});
});

describe('ResolveBar', () => {
	it('offers a whole-file side, an edit and a mark-resolved', async () => {
		await conflicts.load();
		const view = render(ResolveBar, {});

		expect(view.text()).toContain('Take ours');
		expect(view.text()).toContain('Take theirs');
		expect(view.text()).toContain('Edit');
		expect(view.text()).toContain('Mark resolved');

		view.destroy();
	});

	it('counts the conflicts in the file and offers one row for each', async () => {
		await conflicts.load();
		const view = render(ResolveBar, {});

		expect(view.text()).toContain('1 conflict in this file');
		// Numbered from 1 for the reader; the store counts from 0.
		expect(view.text()).toContain('#1');
		expect(view.text()).toContain('lines 2–6');

		view.destroy();
	});

	it('resolves the region the button belongs to', async () => {
		await conflicts.load();
		const view = render(ResolveBar, {});

		const theirs = view.all('.chip').find((c) => c.textContent?.trim() === 'theirs');
		click(theirs as HTMLElement);
		await Promise.resolve();

		expect(resolveRegionCall).toHaveBeenCalledWith('src/a.txt', 0, 'theirs');
		view.destroy();
	});

	it('takes a whole side without touching the regions', async () => {
		await conflicts.load();
		const view = render(ResolveBar, {});

		const take = view.all('button').find((b) => b.textContent?.includes('Take ours'));
		click(take as HTMLElement);
		await Promise.resolve();

		expect(takeCall).toHaveBeenCalledWith('src/a.txt', 'ours');
		view.destroy();
	});

	it('offers an all-of-them shortcut only when there is more than one', async () => {
		await conflicts.load();
		const one = render(ResolveBar, {});
		expect(one.all('.region.all')).toHaveLength(0);
		one.destroy();

		regionsCall.mockResolvedValue([
			{ index: 0, startLine: 2, endLine: 6, ours: 'a\n', base: null, theirs: 'b\n' },
			{ index: 1, startLine: 9, endLine: 13, ours: 'c\n', base: null, theirs: 'd\n' }
		]);
		await conflicts.refreshRegions();

		const two = render(ResolveBar, {});
		expect(two.text()).toContain('2 conflicts in this file');
		expect(two.all('.region.all')).toHaveLength(1);
		two.destroy();
	});

	it('swaps Edit for Save and discard once an edit is under way', async () => {
		await conflicts.load();
		conflicts.edit();
		const view = render(ResolveBar, {});

		expect(view.text()).toContain('Save');
		expect(view.text()).toContain('discard edit');
		expect(view.text()).not.toContain('Edit');

		view.destroy();
	});

	it('says so when a file has no markers left to point at', async () => {
		await conflicts.load();
		regionsCall.mockResolvedValue([]);
		await conflicts.refreshRegions();

		const view = render(ResolveBar, {});
		expect(view.text()).toContain('No conflict markers in this file');
		// The whole-file controls are still there: a delete/modify conflict has
		// no markers and still has to be resolved.
		expect(view.text()).toContain('Take ours');

		view.destroy();
	});
});
