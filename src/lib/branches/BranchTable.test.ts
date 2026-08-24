// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from 'svelte';
import { click, render } from '../../testing/mount';
import type { BranchRow } from '$lib/types';

vi.mock('$lib/api', () => ({
	branches: vi.fn(() => Promise.resolve([])),
	checkout: vi.fn(() => Promise.resolve()),
	createBranch: vi.fn(() => Promise.resolve())
}));

vi.mock('$lib/repo.svelte', async () => await import('../../testing/repo-store.svelte'));

import * as api from '$lib/api';
import { branches } from './store.svelte';
import BranchTable from './BranchTable.svelte';
import { columns } from './columns.svelte';

const list = vi.mocked(api.branches);
const checkout = vi.mocked(api.checkout);

function row(name: string, overrides: Partial<BranchRow> = {}): BranchRow {
	return {
		name,
		fullName: `refs/heads/${name}`,
		kind: 'branch',
		current: false,
		id: 'a'.repeat(40),
		short: 'aaaaaaa',
		summary: `tip of ${name}`,
		authorName: 'Ada Lovelace',
		time: Math.floor(Date.now() / 1000) - 3600,
		upstream: null,
		ahead: null,
		behind: null,
		merged: false,
		...overrides
	};
}

async function show(rows: BranchRow[]) {
	list.mockResolvedValueOnce(rows);
	await branches.load();
	return render(BranchTable, {});
}

/** The rendered width of a column's header cell, which the rows follow. */
function cellWidth(view: { get(selector: string): HTMLElement }, id: string): string {
	return view.get(`[data-column="${id}"]`).style.width;
}

beforeEach(() => {
	vi.clearAllMocks();
	branches.clear();
	columns.reset();
});

describe('BranchTable', () => {
	it('is a table with the four columns the design names', async () => {
		const view = await show([row('main', { current: true })]);

		expect(view.get('.table').getAttribute('role')).toBe('table');
		expect(view.all('[role="columnheader"]').map((h) => h.textContent?.trim())).toEqual([
			'branch',
			'ahead / behind',
			'last change',
			'actions'
		]);

		view.destroy();
	});

	it('marks the current branch and offers no checkout for it', async () => {
		const view = await show([row('main', { current: true }), row('chore/tooling')]);

		const current = view.get('.row.current');
		expect(current.textContent).toContain('main');
		expect(current.textContent).toContain('on this branch');
		expect(current.querySelector('button')).toBeNull();

		view.destroy();
	});

	it('draws a merged branch dashed, since nothing on it is only there', async () => {
		const view = await show([row('merged/old', { merged: true }), row('chore/tooling')]);

		expect(view.all('.row.merged')).toHaveLength(1);
		expect(view.get('.row.merged').textContent).toContain('merged/old');

		view.destroy();
	});

	it('does not draw the current branch as merged, even when it is', async () => {
		// It is merged into itself; saying so would read as "safe to delete".
		const view = await show([row('main', { current: true, merged: true })]);

		expect(view.all('.row.merged')).toHaveLength(0);
		view.destroy();
	});

	/**
	 * The four states the item asks to be distinguishable at a glance, checked
	 * on the shape rather than on the text beside it: one-sided each way, both,
	 * and level. `4/0` reads behind/ahead, in the order the bar draws them.
	 */
	it('draws the divergence as a bar, one side per direction', async () => {
		const view = await show([
			row('ahead-only', { upstream: 'origin/a', ahead: 2, behind: 0 }),
			row('behind-only', { upstream: 'origin/b', ahead: 0, behind: 4 }),
			row('both', { upstream: 'origin/c', ahead: 2, behind: 4 }),
			row('level', { upstream: 'origin/d', ahead: 0, behind: 0 })
		]);

		const widths = view.all('.row').map((r) => [
			(r.querySelector<HTMLElement>('.behind')?.style.width ?? '') as string,
			(r.querySelector<HTMLElement>('.ahead')?.style.width ?? '') as string
		]);

		// Four is the widest on screen, so it fills its half; two is half of it.
		expect(widths).toEqual([
			['0%', '50%'],
			['100%', '0%'],
			['100%', '50%'],
			['0%', '0%']
		]);

		// Level still draws a bar — the tick is the branch's own position, and
		// an empty cell could equally mean "not loaded".
		expect(view.all('.row .tick.level')).toHaveLength(1);
		expect(view.all('.row .counts').map((c) => c.textContent?.trim())).toEqual([
			'0/2',
			'4/0',
			'4/2',
			'level'
		]);

		view.destroy();
	});

	it('draws no bar at all when there is no upstream to compare against', async () => {
		// Not a zero-length bar, which would claim the branch is level with
		// something, and not a dash, which the author called out by name.
		const view = await show([row('main')]);

		expect(view.all('.row .bar')).toHaveLength(0);
		expect(view.get('.row .none').textContent?.trim()).toBe('no upstream');
		expect(view.get('.row .none').getAttribute('title')).toBe('No upstream configured');

		view.destroy();
	});

	it('names the upstream and says the counts are as of the last fetch', async () => {
		const view = await show([row('main', { upstream: 'origin/main', ahead: 1, behind: 0 })]);

		expect(view.get('.up').textContent).toContain('origin/main');
		expect(view.get('.row .bar').getAttribute('title')).toContain('as of the last fetch');
		// Nothing on the bar is glyph-only: the sentence is its accessible name.
		expect(view.get('.row .bar').getAttribute('aria-label')).toContain('origin/main');

		view.destroy();
	});

	it('resizes a column, and hands the width back on a double-click', async () => {
		const view = await show([row('main', { upstream: 'origin/main', ahead: 1, behind: 0 })]);

		const before = columns.width('when');
		columns.resize('when', before + 40);
		await tick();
		expect(cellWidth(view, 'when')).toBe(`${before + 40}px`);

		columns.unsize('when');
		await tick();
		expect(cellWidth(view, 'when')).toBe(`${before}px`);

		view.destroy();
	});

	it('refuses to shrink a column past what it can say anything in', async () => {
		const view = await show([row('main')]);

		columns.resize('drift', 10);
		await tick();
		expect(cellWidth(view, 'drift')).toBe('90px');

		view.destroy();
	});

	it('checks out from a local row', async () => {
		const view = await show([row('chore/tooling')]);

		const button = view.all('button').find((b) => b.textContent?.includes('Check out'));
		click(button as HTMLElement);

		expect(checkout).toHaveBeenCalledWith('chore/tooling');
		view.destroy();
	});

	it('offers to branch from a remote-tracking row rather than check it out', async () => {
		// Checking out a remote-tracking ref detaches HEAD, which is almost
		// never what someone clicking a row means.
		const view = await show([
			row('origin/feature/split-view', {
				kind: 'remote',
				fullName: 'refs/remotes/origin/feature/split-view'
			})
		]);

		const button = view.all('button').find((b) => b.textContent?.includes('Branch from it'));
		click(button as HTMLElement);

		expect(checkout).not.toHaveBeenCalled();
		// The local name drops the remote, and the start point keeps it.
		expect(branches.newName).toBe('feature/split-view');
		expect(branches.newStart).toBe('origin/feature/split-view');

		view.destroy();
	});

	it('says deleting is not built rather than hiding the button', async () => {
		const view = await show([row('merged/old', { merged: true })]);

		const del = view.all('.chip').find((c) => c.textContent?.includes('Delete'));
		expect(del?.getAttribute('title')).toBe('Deleting branches is not built yet');
		// A label, not a button: it does nothing, and looking clickable would lie.
		expect(del?.tagName).toBe('SPAN');

		view.destroy();
	});

	it('disables the actions while a write is in flight', async () => {
		let release!: () => void;
		checkout.mockReturnValueOnce(new Promise<void>((resolve) => (release = resolve)));

		const view = await show([row('chore/tooling'), row('other')]);
		const button = view.all('button').find((b) => b.textContent?.includes('Check out'));
		click(button as HTMLElement);

		for (const b of view.all('button')) {
			expect((b as HTMLButtonElement).disabled).toBe(true);
		}

		release();
		view.destroy();
	});

	it('tells an empty repository from an over-narrow filter', async () => {
		const empty = await show([]);
		expect(empty.text()).toContain('no branches yet');
		empty.destroy();

		const filtered = await show([row('chore/tooling')]);
		branches.setQuery('nothing-matches-this');
		const narrow = render(BranchTable, {});
		expect(narrow.text()).toContain('No branch matches those filters');

		filtered.destroy();
		narrow.destroy();
	});
});
