// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { click, fire, press, render } from '../../testing/mount';
import type { PreviewRow, RebasePreview, RebaseTodo, TodoRow } from '$lib/types';

vi.mock('$lib/api', () => ({
	rebaseTodo: vi.fn(),
	rebasePreview: vi.fn()
}));

import * as api from '$lib/api';
import PreviewPane from './PreviewPane.svelte';
import { rebase } from './store.svelte';
import TodoList from './TodoList.svelte';

const rebaseTodo = vi.mocked(api.rebaseTodo);
const rebasePreview = vi.mocked(api.rebasePreview);

function todoRow(n: number): TodoRow {
	return {
		id: `${n}`.repeat(40),
		short: `${n}`.repeat(7),
		summary: `Commit ${n}`,
		authorName: 'Ada Lovelace',
		time: 1_700_000_000 + n,
		paths: [`file${n}.txt`]
	};
}

function todoOf(count = 3): RebaseTodo {
	return {
		upstream: 'f'.repeat(40),
		upstreamShort: 'fffffff',
		rows: Array.from({ length: count }, (_, n) => todoRow(n + 1)),
		truncated: false
	};
}

function previewRow(n: number, overrides: Partial<PreviewRow> = {}): PreviewRow {
	return {
		id: `${n}`.repeat(40),
		short: `${n}`.repeat(7),
		summary: `Commit ${n}`,
		absorbed: [],
		reworded: false,
		mayConflict: false,
		...overrides
	};
}

function previewOf(overrides: Partial<RebasePreview> = {}): RebasePreview {
	return {
		rows: [],
		dropped: [],
		refusal: null,
		emptiesTheBranch: false,
		...overrides
	};
}

async function planned() {
	rebase.upstream = 'main';
	await rebase.load();
}

beforeEach(() => {
	vi.clearAllMocks();
	rebase.clear();
	rebaseTodo.mockResolvedValue(todoOf());
	rebasePreview.mockResolvedValue(previewOf());
});

describe('TodoList', () => {
	it('draws one row per commit, in plan order, with its summary and short id', async () => {
		await planned();
		const view = render(TodoList, {});

		const rows = view.all('.row');
		expect(rows).toHaveLength(3);
		expect(rows[0].textContent).toContain('Commit 1');
		expect(rows[0].textContent).toContain('1111111');
		view.destroy();
	});

	it('offers every action, with the current one marked', async () => {
		await planned();
		const view = render(TodoList, {});

		const chips = view.all('.row')[0].querySelectorAll('.chip');
		expect([...chips].map((chip) => chip.textContent?.trim())).toEqual([
			'pick',
			'squash',
			'reword',
			'drop'
		]);
		expect(view.all('.row')[0].querySelector('.chip.active')?.textContent?.trim()).toBe(
			'pick'
		);
		view.destroy();
	});

	it('each action chip says what it would do', async () => {
		await planned();
		const view = render(TodoList, {});

		const chips = [...view.all('.row')[0].querySelectorAll('.chip')] as HTMLElement[];
		expect(chips[1].title).toContain('above');
		expect(chips[3].title).toContain('out of the result');
		view.destroy();
	});

	it('clicking an action sets it', async () => {
		await planned();
		const view = render(TodoList, {});

		click([...view.all('.row')[0].querySelectorAll('.chip')][3] as HTMLElement);
		await Promise.resolve();

		expect(rebase.plan[0].action).toBe('drop');
		view.destroy();
	});

	it('a dropped commit stays visible and reads as spent', async () => {
		await planned();
		await rebase.setAction(todoRow(2).id, 'drop');
		const view = render(TodoList, {});

		expect(view.all('.row')).toHaveLength(3);
		expect(view.all('.row.dropped')).toHaveLength(1);
		view.destroy();
	});

	it('moves a row with the keyboard, so reordering does not need a pointer', async () => {
		// Drag alone is untestable headlessly and unusable for some people.
		await planned();
		const view = render(TodoList, {});

		press(view.all('.row')[0].querySelector('.body') as HTMLElement, 'ArrowDown', {
			altKey: true
		});
		await Promise.resolve();

		expect(rebase.plan.map((entry) => entry.id)).toEqual([
			todoRow(2).id,
			todoRow(1).id,
			todoRow(3).id
		]);
		view.destroy();
	});

	it('a plain arrow key does not move anything', async () => {
		await planned();
		const view = render(TodoList, {});

		press(view.all('.row')[0].querySelector('.body') as HTMLElement, 'ArrowDown');
		await Promise.resolve();

		expect(rebase.plan.map((entry) => entry.id)).toEqual(
			todoOf().rows.map((row) => row.id)
		);
		view.destroy();
	});

	it('marks the focused row', async () => {
		await planned();
		const view = render(TodoList, {});

		expect(view.all('.row.focused')).toHaveLength(1);
		expect(view.all('.row.focused')[0].textContent).toContain('Commit 1');
		view.destroy();
	});

	it('a drag moves the row it was dropped onto', async () => {
		await planned();
		const view = render(TodoList, {});
		const rows = view.all('.row');

		fire(rows[0], 'dragstart');
		fire(rows[2], 'dragover');
		fire(rows[2], 'drop');
		await Promise.resolve();

		expect(rebase.plan.map((entry) => entry.id)).toEqual([
			todoRow(2).id,
			todoRow(3).id,
			todoRow(1).id
		]);
		view.destroy();
	});

	it('dropping a row on itself changes nothing', async () => {
		await planned();
		const view = render(TodoList, {});
		const rows = view.all('.row');

		fire(rows[1], 'dragstart');
		fire(rows[1], 'drop');
		await Promise.resolve();

		expect(rebase.plan.map((entry) => entry.id)).toEqual(
			todoOf().rows.map((row) => row.id)
		);
		view.destroy();
	});

	it('a drop with nothing being dragged is ignored', async () => {
		await planned();
		const view = render(TodoList, {});

		fire(view.all('.row')[1], 'drop');
		await Promise.resolve();

		expect(rebase.plan.map((entry) => entry.id)).toEqual(
			todoOf().rows.map((row) => row.id)
		);
		view.destroy();
	});

	it('ending a drag without dropping leaves the plan alone', async () => {
		await planned();
		const view = render(TodoList, {});
		const rows = view.all('.row');

		fire(rows[0], 'dragstart');
		fire(rows[0], 'dragend');
		fire(rows[2], 'drop');
		await Promise.resolve();

		expect(rebase.plan.map((entry) => entry.id)).toEqual(
			todoOf().rows.map((row) => row.id)
		);
		view.destroy();
	});

	it('the handle says both ways to reorder', async () => {
		await planned();
		const view = render(TodoList, {});

		expect(view.get('.handle').title).toContain('Drag');
		expect(view.get('.handle').title).toContain('⌥');
		view.destroy();
	});
});

describe('PreviewPane', () => {
	it('says what it is for before anything is planned', () => {
		const view = render(PreviewPane, {});

		expect(view.text()).toContain('Choose an upstream');
		view.destroy();
	});

	it('draws one row per commit the plan would leave', async () => {
		rebasePreview.mockResolvedValue(
			previewOf({ rows: [previewRow(1), previewRow(2)] })
		);
		await planned();
		const view = render(PreviewPane, {});

		expect(view.all('.row')).toHaveLength(2);
		view.destroy();
	});

	it('says how many commits were folded into a row', async () => {
		rebasePreview.mockResolvedValue(
			previewOf({ rows: [previewRow(1, { absorbed: ['a', 'b'] })] })
		);
		await planned();
		const view = render(PreviewPane, {});

		expect(view.text()).toContain('+2 squashed');
		view.destroy();
	});

	it('marks a reworded row', async () => {
		rebasePreview.mockResolvedValue(
			previewOf({ rows: [previewRow(1, { reworded: true })] })
		);
		await planned();
		const view = render(PreviewPane, {});

		expect(view.text()).toContain('reworded');
		view.destroy();
	});

	it('says "may conflict" in that word, because the check is a heuristic', async () => {
		// Claiming a clean result we cannot prove would be the worse lie.
		rebasePreview.mockResolvedValue(
			previewOf({ rows: [previewRow(1, { mayConflict: true })] })
		);
		await planned();
		const view = render(PreviewPane, {});

		expect(view.text()).toContain('may conflict');
		expect(view.all('.row.risky')).toHaveLength(1);
		view.destroy();
	});

	it('counts what the plan drops', async () => {
		rebasePreview.mockResolvedValue(
			previewOf({ rows: [previewRow(1)], dropped: ['a', 'b'] })
		);
		await planned();
		const view = render(PreviewPane, {});

		expect(view.text()).toContain('2 commits dropped');
		view.destroy();
	});

	it('a plan that empties the branch explains what that means', async () => {
		rebasePreview.mockResolvedValue(
			previewOf({ emptiesTheBranch: true, dropped: ['a', 'b', 'c'] })
		);
		await planned();
		const view = render(PreviewPane, {});

		expect(view.text()).toContain('drops every commit');
		expect(view.all('.row')).toHaveLength(0);
		view.destroy();
	});

	it('a plan that cannot run says so instead of drawing a result', async () => {
		rebasePreview.mockResolvedValue(
			previewOf({ refusal: 'the first commit cannot be a squash' })
		);
		await planned();
		const view = render(PreviewPane, {});

		expect(view.text()).toContain('cannot run');
		expect(view.text()).toContain('cannot be a squash');
		expect(view.all('.row')).toHaveLength(0);
		view.destroy();
	});
});
