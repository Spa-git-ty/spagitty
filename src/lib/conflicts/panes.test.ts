// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { click, render } from '../../testing/mount';
import type { ConflictFile, ConflictSide, ConflictSides, ConflictState } from '$lib/types';

vi.mock('$lib/api', () => ({
	conflicts: vi.fn(),
	conflictSides: vi.fn()
}));

import * as api from '$lib/api';
import ConflictPager from './ConflictPager.svelte';
import SidePane from './SidePane.svelte';
import { conflicts } from './store.svelte';

const listCall = vi.mocked(api.conflicts);
const sidesCall = vi.mocked(api.conflictSides);

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
