// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RebaseEdit, RebasePreview, RebaseTodo, TodoRow } from '$lib/types';

vi.mock('$lib/api', () => ({
	rebaseTodo: vi.fn(),
	rebasePreview: vi.fn()
}));

import * as api from '$lib/api';
import { ACTION_MEANINGS, ACTIONS, rebase } from './store.svelte';

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

function todoOf(count = 3, overrides: Partial<RebaseTodo> = {}): RebaseTodo {
	return {
		upstream: 'f'.repeat(40),
		upstreamShort: 'fffffff',
		rows: Array.from({ length: count }, (_, n) => todoRow(n + 1)),
		truncated: false,
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

/** What the last preview call was asked to fold. */
function lastPlan(): RebaseEdit[] {
	return rebasePreview.mock.calls[rebasePreview.mock.calls.length - 1][0];
}

beforeEach(() => {
	vi.clearAllMocks();
	rebase.clear();
	rebaseTodo.mockResolvedValue(todoOf());
	rebasePreview.mockResolvedValue(previewOf());
});

describe('loading a todo', () => {
	it('refuses to plan without an upstream', async () => {
		await rebase.load();

		expect(rebaseTodo).not.toHaveBeenCalled();
	});

	it('starts from an unedited plan: every row picked, in git\'s order', async () => {
		rebase.upstream = 'main';

		await rebase.load();

		expect(rebase.plan.map((entry) => entry.action)).toEqual(['pick', 'pick', 'pick']);
		expect(rebase.plan.map((entry) => entry.id)).toEqual(
			todoOf().rows.map((row) => row.id)
		);
		expect(rebase.edited).toBe(false);
	});

	it('trims the upstream before asking', async () => {
		rebase.upstream = '  main  ';

		await rebase.load();

		expect(rebaseTodo).toHaveBeenCalledWith('main');
	});

	it('previews the unedited plan without being asked', async () => {
		rebase.upstream = 'main';

		await rebase.load();

		expect(rebasePreview).toHaveBeenCalledOnce();
	});

	it('records a refusal and shows nothing', async () => {
		rebaseTodo.mockRejectedValue(
			new Error('main shares no history with this branch')
		);
		rebase.upstream = 'main';

		await rebase.load();

		expect(rebase.error).toContain('shares no history');
		expect(rebase.todo).toBeNull();
		expect(rebase.plan).toEqual([]);
	});

	it('focuses the first row, so the keyboard has somewhere to start', async () => {
		rebase.upstream = 'main';

		await rebase.load();

		expect(rebase.focused).toBe(todoRow(1).id);
	});
});

describe('editing the plan', () => {
	beforeEach(async () => {
		rebase.upstream = 'main';
		await rebase.load();
		rebasePreview.mockClear();
	});

	it('sets an action and recomputes', async () => {
		await rebase.setAction(todoRow(2).id, 'squash');

		expect(rebase.plan[1].action).toBe('squash');
		expect(rebasePreview).toHaveBeenCalledOnce();
		expect(lastPlan()[1]).toEqual({ id: todoRow(2).id, action: 'squash' });
	});

	it('sends the complete plan, not only what changed', async () => {
		// The plan is the list, and its order is the order.
		await rebase.setAction(todoRow(2).id, 'drop');

		expect(lastPlan()).toHaveLength(3);
	});

	it('an action for a commit that is not in the plan is ignored', async () => {
		await rebase.setAction('9'.repeat(40), 'drop');

		expect(rebasePreview).not.toHaveBeenCalled();
	});

	it('moves a row down and recomputes', async () => {
		await rebase.move(todoRow(1).id, 1);

		expect(rebase.plan.map((entry) => entry.id)).toEqual([
			todoRow(2).id,
			todoRow(1).id,
			todoRow(3).id
		]);
		expect(lastPlan().map((entry) => entry.id)).toEqual([
			todoRow(2).id,
			todoRow(1).id,
			todoRow(3).id
		]);
	});

	it('moves a row up', async () => {
		await rebase.move(todoRow(3).id, -1);

		expect(rebase.plan.map((entry) => entry.id)).toEqual([
			todoRow(1).id,
			todoRow(3).id,
			todoRow(2).id
		]);
	});

	it('will not move a row off either end', async () => {
		await rebase.move(todoRow(1).id, -1);
		await rebase.move(todoRow(3).id, 1);

		expect(rebase.plan.map((entry) => entry.id)).toEqual(
			todoOf().rows.map((row) => row.id)
		);
		expect(rebasePreview).not.toHaveBeenCalled();
	});

	it('a moved row keeps the focus, so the keyboard can move it again', async () => {
		await rebase.move(todoRow(1).id, 1);

		expect(rebase.focused).toBe(todoRow(1).id);
	});

	it('an action or a move makes the plan edited; resetting undoes it', async () => {
		await rebase.setAction(todoRow(2).id, 'drop');
		expect(rebase.edited).toBe(true);

		await rebase.reset();

		expect(rebase.edited).toBe(false);
		expect(rebase.plan.every((entry) => entry.action === 'pick')).toBe(true);
	});

	it('a reorder alone counts as edited', async () => {
		await rebase.move(todoRow(1).id, 1);

		expect(rebase.edited).toBe(true);
	});

	it('drops a superseded preview', async () => {
		let release!: (value: RebasePreview) => void;
		rebasePreview.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
		rebasePreview.mockResolvedValue(previewOf({ dropped: ['newer'] }));

		const first = rebase.setAction(todoRow(1).id, 'drop');
		await rebase.setAction(todoRow(2).id, 'drop');
		release(previewOf({ dropped: ['stale'] }));
		await first;

		expect(rebase.preview?.dropped).toEqual(['newer']);
	});

	it('records a preview failure', async () => {
		rebasePreview.mockRejectedValue(new Error('no rebase is being planned'));

		await rebase.setAction(todoRow(1).id, 'drop');

		expect(rebase.error).toContain('no rebase is being planned');
		expect(rebase.preview).toBeNull();
	});
});

describe('what the screen reads', () => {
	beforeEach(async () => {
		rebase.upstream = 'main';
		await rebase.load();
	});

	it('pairs each plan entry with the commit it is about, in plan order', async () => {
		await rebase.move(todoRow(3).id, -2);

		expect(rebase.rows.map((entry) => entry.row.summary)).toEqual([
			'Commit 3',
			'Commit 1',
			'Commit 2'
		]);
	});

	it('carries a refusal through rather than pretending the plan is fine', async () => {
		rebasePreview.mockResolvedValue(
			previewOf({ refusal: 'the first commit cannot be a squash' })
		);

		await rebase.setAction(todoRow(1).id, 'squash');

		expect(rebase.preview?.refusal).toContain('cannot be a squash');
	});

	it('a plan that empties the branch is a warning, not a failure', async () => {
		rebasePreview.mockResolvedValue(previewOf({ emptiesTheBranch: true, dropped: ['a'] }));

		await rebase.setAction(todoRow(1).id, 'drop');

		expect(rebase.preview?.emptiesTheBranch).toBe(true);
		expect(rebase.preview?.refusal).toBeNull();
	});

	it('names what every action does, since a chip alone does not', () => {
		expect(ACTIONS).toEqual(['pick', 'squash', 'reword', 'drop']);
		expect(ACTION_MEANINGS.squash).toContain('above');
		expect(ACTION_MEANINGS.reword).toContain('message');
		expect(ACTION_MEANINGS.drop).toContain('out of the result');
	});
});

describe('clear', () => {
	it('forgets the plan and the upstream', async () => {
		rebase.upstream = 'main';
		await rebase.load();

		rebase.clear();

		expect(rebase.todo).toBeNull();
		expect(rebase.plan).toEqual([]);
		expect(rebase.preview).toBeNull();
		expect(rebase.upstream).toBe('');
		expect(rebase.loaded).toBe(false);
	});
});
