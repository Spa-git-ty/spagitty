// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { click, render } from '../../testing/mount';
import type { CommitDiff, StashEntry } from '$lib/types';

const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (path: string) => goto(path) }));

vi.mock('$lib/api', () => ({
	stashes: vi.fn(),
	stashPush: vi.fn(() => Promise.resolve()),
	commitDiff: vi.fn()
}));

vi.mock('$lib/repo.svelte', async () => await import('../../testing/repo-store.svelte'));

import * as api from '$lib/api';
import { stash } from './store.svelte';
import StashDetail from './StashDetail.svelte';
import StashList from './StashList.svelte';

const stashes = vi.mocked(api.stashes);
const commitDiff = vi.mocked(api.commitDiff);

function entry(index: number, overrides: Partial<StashEntry> = {}): StashEntry {
	const id = `${index}`.padStart(40, 'a');
	return {
		index,
		name: `stash@{${index}}`,
		id,
		short: id.slice(0, 7),
		message: `On main: entry ${index}`,
		time: Math.floor(Date.now() / 1000) - 3600,
		authorName: 'Ada Lovelace',
		parent: 'b'.repeat(40),
		parentShort: 'bbbbbbb',
		parentSummary: 'Merge feature/split-view',
		...overrides
	};
}

function diff(id: string, files: CommitDiff['files'] = []): CommitDiff {
	return { id, short: id.slice(0, 7), summary: 'a stash', files, added: 1, removed: 0 };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

async function show(entries: StashEntry[]) {
	stashes.mockResolvedValueOnce(entries);
	await stash.load();
	await settle();
}

beforeEach(() => {
	vi.clearAllMocks();
	stash.clear();
	commitDiff.mockImplementation((id: string) =>
		Promise.resolve(
			diff(id, [
				{
					path: '.gitignore',
					status: 'modified',
					binary: false,
					tooLarge: false,
					added: 1,
					removed: 0
				}
			])
		)
	);
});

describe('StashList', () => {
	it('names each entry the way git does and says what it hangs off', async () => {
		await show([entry(0), entry(1)]);
		const view = render(StashList, {});

		expect(view.all('.entry')).toHaveLength(2);
		expect(view.text()).toContain('stash@{0}');
		expect(view.text()).toContain('stash@{1}');
		expect(view.text()).toContain('bbbbbbb');
		expect(view.text()).toContain('Merge feature/split-view');

		view.destroy();
	});

	it('draws the entry hanging off its commit', async () => {
		// A stash is a commit with a parent; the lane says so rather than the
		// list being a flat set of rows.
		await show([entry(0)]);
		const view = render(StashList, {});

		const lane = view.get('.lane');
		expect(lane.querySelectorAll('circle')).toHaveLength(2);
		expect(lane.querySelector('path')?.getAttribute('d')).toContain('C');

		view.destroy();
	});

	it('opens an entry when its row is clicked', async () => {
		await show([entry(0), entry(1)]);
		const view = render(StashList, {});
		commitDiff.mockClear();

		click(view.all('.entry')[1]);

		expect(commitDiff).toHaveBeenCalledWith(entry(1).id);
		view.destroy();
	});

	it('marks the open entry', async () => {
		await show([entry(0), entry(1)]);
		const view = render(StashList, {});

		expect(view.all('.entry.selected')).toHaveLength(1);
		expect(view.get('.entry.selected').textContent).toContain('stash@{0}');

		view.destroy();
	});

	it('explains what a stash is when there is none', async () => {
		await show([]);
		const view = render(StashList, {});

		expect(view.text()).toContain('Nothing is stashed');
		expect(view.text()).toContain('puts your uncommitted work aside');

		view.destroy();
	});
});

describe('StashDetail', () => {
	it('asks for an entry when none is open', () => {
		const view = render(StashDetail, {});
		expect(view.text()).toContain('Select an entry');
		view.destroy();
	});

	it('shows the entry, who stashed it, and what is in it', async () => {
		await show([entry(0)]);
		const view = render(StashDetail, {});

		expect(view.text()).toContain('stash@{0}');
		expect(view.text()).toContain('Ada Lovelace');
		expect(view.text()).toContain('made on bbbbbbb');
		expect(view.text()).toContain('1 file');
		expect(view.get('.path').textContent).toBe('‎.gitignore');

		view.destroy();
	});

	it('opens the full diff for the entry, which is just a commit', async () => {
		await show([entry(0)]);
		const view = render(StashDetail, {});

		const button = view.all('button').find((b) => b.textContent?.includes('Open full diff'));
		click(button as HTMLElement);

		expect(goto).toHaveBeenCalledWith(`/diff?commit=${entry(0).id}`);
		view.destroy();
	});

	it('says what pop, apply and drop would do rather than hiding them', async () => {
		// Restoring the work is what a stash is for; a screen that listed
		// stashes and pretended they could not be restored would be lying.
		await show([entry(0)]);
		const view = render(StashDetail, {});

		const chips = view.all('.chip');
		const labels = chips.map((c) => c.textContent?.trim());
		expect(labels).toContain('Pop');
		expect(labels).toContain('Apply — keep in stash');
		expect(labels).toContain('Drop');

		for (const chip of chips) {
			expect(chip.getAttribute('title')).toContain('Not built yet');
			// Labels, not buttons: looking clickable would lie.
			expect(chip.tagName).toBe('SPAN');
		}
		expect(view.text()).toContain('git stash pop stash@{0}');

		view.destroy();
	});

	it('says an entry that changed nothing changed nothing', async () => {
		commitDiff.mockImplementation((id: string) => Promise.resolve(diff(id, [])));
		await show([entry(0)]);
		const view = render(StashDetail, {});

		expect(view.text()).toContain('changed nothing');
		view.destroy();
	});

	it('shows a read failure instead of the file list', async () => {
		commitDiff.mockRejectedValue('no commit');
		await show([entry(0)]);
		const view = render(StashDetail, {});

		expect(view.text()).toContain('no commit');
		view.destroy();
	});
});
