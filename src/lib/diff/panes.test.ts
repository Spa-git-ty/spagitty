// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { click, flushSync, render } from '../../testing/mount';
import type { CommitDiff, FileChange, FileDiff, Hunk } from '$lib/types';

vi.mock('$lib/api', () => ({ commitDiff: vi.fn(), fileDiff: vi.fn() }));

import * as api from '$lib/api';
import { diff } from './store.svelte';
import DiffPane from './DiffPane.svelte';
import FileList from './FileList.svelte';

const commitDiff = vi.mocked(api.commitDiff);
const fileDiff = vi.mocked(api.fileDiff);

function change(path: string, overrides: Partial<FileChange> = {}): FileChange {
	return {
		path,
		status: 'modified',
		binary: false,
		tooLarge: false,
		added: 2,
		removed: 1,
		...overrides
	};
}

function commit(files: FileChange[]): CommitDiff {
	return {
		id: 'a'.repeat(40),
		short: 'aaaaaaa',
		summary: 'a commit',
		files,
		added: files.reduce((n, f) => n + f.added, 0),
		removed: files.reduce((n, f) => n + f.removed, 0)
	};
}

const oneHunk: Hunk = {
	oldStart: 1,
	oldLines: 3,
	newStart: 1,
	newLines: 3,
	header: '@@ -1,3 +1,3 @@',
	lines: [
		{ origin: 'context', old: 1, new: 1, text: 'keep me' },
		{ origin: 'removed', old: 2, new: null, text: 'gone' },
		{ origin: 'added', old: null, new: 2, text: 'arrived' },
		{ origin: 'context', old: 3, new: 3, text: 'keep me too' }
	]
};

function file(path: string, overrides: Partial<FileDiff> = {}): FileDiff {
	return {
		path,
		status: 'modified',
		binary: false,
		tooLarge: false,
		added: 1,
		removed: 1,
		hunks: [oneHunk],
		...overrides
	};
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	vi.clearAllMocks();
	diff.clear();
	vi.stubGlobal('localStorage', {
		getItem: () => null,
		setItem: () => {},
		removeItem: () => {}
	});
	// Nothing in these tests scrolls for real.
	Element.prototype.scrollIntoView = () => {};
});

describe('FileList', () => {
	it('lists the files a commit touched with their line counts', async () => {
		commitDiff.mockResolvedValue(commit([change('a.txt'), change('b/c.txt', { added: 5 })]));
		fileDiff.mockResolvedValue(file('a.txt'));
		await diff.open('abc');
		await settle();

		const view = render(FileList, {});
		flushSync();

		const rows = view.all('.file');
		expect(rows).toHaveLength(2);
		expect(view.text()).toContain('a.txt');
		expect(view.text()).toContain('+2');
		expect(view.text()).toContain('+5');

		view.destroy();
	});

	it('says why a file has no counts rather than showing +0 −0', async () => {
		commitDiff.mockResolvedValue(
			commit([
				change('logo.bin', { binary: true, added: 0, removed: 0 }),
				change('huge.sql', { tooLarge: true, added: 0, removed: 0 })
			])
		);
		fileDiff.mockResolvedValue(file('logo.bin', { binary: true, hunks: [] }));
		await diff.open('abc');
		await settle();

		const view = render(FileList, {});
		flushSync();

		expect(view.text()).toContain('bin');
		expect(view.text()).toContain('big');
		expect(view.text()).not.toContain('+0');

		view.destroy();
	});

	it('selects a file when its row is clicked', async () => {
		commitDiff.mockResolvedValue(commit([change('a.txt'), change('b.txt')]));
		fileDiff.mockImplementation((_id, path) => Promise.resolve(file(path)));
		await diff.open('abc');
		await settle();

		const view = render(FileList, {});
		flushSync();

		click(view.all('.file')[1]);
		expect(diff.path).toBe('b.txt');

		view.destroy();
	});

	it('marks the selected row', async () => {
		commitDiff.mockResolvedValue(commit([change('a.txt'), change('b.txt')]));
		fileDiff.mockImplementation((_id, path) => Promise.resolve(file(path)));
		await diff.open('abc');
		await settle();

		const view = render(FileList, {});
		flushSync();

		expect(view.all('.file')[0].classList.contains('selected')).toBe(true);
		click(view.all('.file')[1]);
		expect(view.all('.file')[1].classList.contains('selected')).toBe(true);
		expect(view.all('.file')[0].classList.contains('selected')).toBe(false);

		view.destroy();
	});

	it('keeps a dotfile reading as a dotfile', async () => {
		// The column elides its head, which needs `direction: rtl`; without the
		// left-to-right mark the leading dot is reordered to the end.
		commitDiff.mockResolvedValue(commit([change('.gitignore')]));
		fileDiff.mockResolvedValue(file('.gitignore'));
		await diff.open('abc');
		await settle();

		const view = render(FileList, {});
		flushSync();

		expect(view.get('.path').textContent).toBe('‎.gitignore');

		view.destroy();
	});

	it('says so when a commit changed nothing', async () => {
		commitDiff.mockResolvedValue(commit([]));
		await diff.open('empty');
		await settle();

		const view = render(FileList, {});
		flushSync();

		expect(view.text()).toContain('No file changes');
		view.destroy();
	});
});

describe('DiffPane', () => {
	async function openWith(f: FileDiff) {
		commitDiff.mockResolvedValue(commit([change(f.path)]));
		fileDiff.mockResolvedValue(f);
		await diff.open('abc');
		await settle();
	}

	it('renders a unified hunk with numbers on both sides', async () => {
		await openWith(file('a.txt'));

		const view = render(DiffPane, { focus: 0 });
		flushSync();

		expect(view.text()).toContain('@@ -1,3 +1,3 @@');
		const removed = view.get('.line.removed');
		const added = view.get('.line.added');
		expect(removed.textContent).toContain('gone');
		expect(added.textContent).toContain('arrived');
		// A removed line has an old number and no new one.
		expect(removed.querySelectorAll('.num')[0].textContent).toBe('2');
		expect(removed.querySelectorAll('.num')[1].textContent).toBe('');

		view.destroy();
	});

	it('renders the same lines side by side in split view', async () => {
		await openWith(file('a.txt'));
		diff.setView('split');

		const view = render(DiffPane, { focus: 0 });
		flushSync();

		expect(view.text()).toContain('before');
		expect(view.text()).toContain('after');
		const pairs = view.all('.pair');
		expect(pairs).toHaveLength(3); // context, the changed pair, context
		expect(pairs[1].textContent).toContain('gone');
		expect(pairs[1].textContent).toContain('arrived');

		view.destroy();
		diff.setView('unified');
	});

	it('tints the empty half of an uneven pairing', async () => {
		await openWith(
			file('a.txt', {
				hunks: [
					{
						...oneHunk,
						lines: [
							{ origin: 'removed', old: 1, new: null, text: 'one' },
							{ origin: 'removed', old: 2, new: null, text: 'two' },
							{ origin: 'added', old: null, new: 1, text: 'merged' }
						]
					}
				]
			})
		);
		diff.setView('split');

		const view = render(DiffPane, { focus: 0 });
		flushSync();

		expect(view.all('.side.blank')).toHaveLength(1);

		view.destroy();
		diff.setView('unified');
	});

	it('says a binary file has no lines', async () => {
		await openWith(file('logo.bin', { binary: true, hunks: [] }));

		const view = render(DiffPane, { focus: 0 });
		flushSync();

		expect(view.text()).toContain('Binary file');
		view.destroy();
	});

	it('says an over-large file is too large', async () => {
		await openWith(file('huge.sql', { tooLarge: true, hunks: [] }));

		const view = render(DiffPane, { focus: 0 });
		flushSync();

		expect(view.text()).toContain('too large');
		view.destroy();
	});

	it('distinguishes a mode-only change from an empty pane', async () => {
		await openWith(file('script.sh', { hunks: [] }));

		const view = render(DiffPane, { focus: 0 });
		flushSync();

		expect(view.text()).toContain("only the file's mode changed");
		view.destroy();
	});

	it('shows a file error instead of the hunks', async () => {
		commitDiff.mockResolvedValue(commit([change('a.txt')]));
		fileDiff.mockRejectedValue('no file a.txt in that commit');
		await diff.open('abc');
		await settle();

		const view = render(DiffPane, { focus: 0 });
		flushSync();

		expect(view.text()).toContain('no file a.txt in that commit');
		view.destroy();
	});

	it('asks for a file to be selected when none is', () => {
		const view = render(DiffPane, { focus: 0 });
		flushSync();
		expect(view.text()).toContain('Select a file');
		view.destroy();
	});

	it('brings the focused hunk into view', async () => {
		const scrolled: HTMLElement[] = [];
		Element.prototype.scrollIntoView = function () {
			scrolled.push(this as HTMLElement);
		};

		await openWith(
			file('a.txt', { hunks: [oneHunk, { ...oneHunk, header: '@@ -20,3 +20,3 @@' }] })
		);

		const view = render(DiffPane, { focus: 1 });
		flushSync();

		expect(scrolled.at(-1)?.textContent).toContain('@@ -20,3 +20,3 @@');
		view.destroy();
	});
});
