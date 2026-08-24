// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	REBASE_DONE_EVENT,
	REBASE_PROGRESS_EVENT,
	type RebaseEdit,
	type RebasePreview,
	type RebaseTodo,
	type TodoRow
} from '$lib/types';

/** Handlers registered by `rebase.attach`, keyed by event name. */
const handlers = new Map<string, (event: { payload: unknown }) => void>();

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn((name: string, handler: (event: { payload: unknown }) => void) => {
		handlers.set(name, handler);
		return Promise.resolve(vi.fn());
	})
}));

vi.mock('$lib/repo.svelte', async () => await import('../../testing/repo-store.svelte'));

vi.mock('$lib/api', () => ({
	rebaseTodo: vi.fn(),
	rebasePreview: vi.fn(),
	rebaseRun: vi.fn(),
	rebaseProgress: vi.fn(),
	rebaseContinue: vi.fn(),
	rebaseSkip: vi.fn(),
	rebaseAbort: vi.fn()
}));

import * as api from '$lib/api';
import { ACTION_MEANINGS, ACTIONS, rebase } from './store.svelte';

const rebaseTodo = vi.mocked(api.rebaseTodo);
const rebasePreview = vi.mocked(api.rebasePreview);
const rebaseRun = vi.mocked(api.rebaseRun);
const rebaseProgress = vi.mocked(api.rebaseProgress);
const rebaseContinue = vi.mocked(api.rebaseContinue);
const rebaseSkip = vi.mocked(api.rebaseSkip);
const rebaseAbort = vi.mocked(api.rebaseAbort);

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

/** Deliver one event to whatever `attach` registered for it. */
function emit(name: string, payload: unknown): void {
	handlers.get(name)?.({ payload });
}

/**
 * Put the store back to "no rebase running".
 *
 * `clear()` deliberately does not forget a running rebase — it belongs to the
 * repository rather than to the screen's plan — so a test that started one
 * finishes it the way the application would, with a done event.
 */
async function idle(): Promise<void> {
	if (rebase.token === null) return;
	await rebase.attach();
	rebaseProgress.mockResolvedValue(null);
	emit(REBASE_DONE_EVENT, { token: rebase.token, ok: true, stopped: false, error: null });
	await Promise.resolve();
}

/** A rebase running, with its listeners attached and its token known. */
async function started(token = 7) {
	await rebase.attach();
	rebaseRun.mockResolvedValueOnce(token);
	await rebase.run();
	return token;
}

describe('running a plan', () => {
	beforeEach(async () => {
		await idle();
		handlers.clear();
		rebaseProgress.mockResolvedValue(null);
		rebaseTodo.mockResolvedValue(todoOf());
		rebasePreview.mockResolvedValue(previewOf());
		rebase.upstream = 'main';
		await rebase.load();
	});

	it('resolves when the rebase has started, not when it has finished', async () => {
		rebaseRun.mockResolvedValueOnce(7);

		expect(await rebase.run()).toBe(true);
		expect(rebase.running).toBe(true);
		// Nothing has been decided yet: the outcome arrives on an event.
		expect(rebase.outcome).toBeNull();
	});

	it('sends the whole plan, so what was previewed is what runs', async () => {
		rebaseRun.mockResolvedValueOnce(7);
		await rebase.run();

		expect(rebaseRun).toHaveBeenCalledWith(rebase.plan);
	});

	it('refuses a second rebase while one is running', async () => {
		await started();
		rebaseRun.mockClear();

		expect(await rebase.run()).toBe(false);
		expect(rebaseRun).not.toHaveBeenCalled();
	});

	it('reports a rebase that could not be started at all', async () => {
		rebaseRun.mockRejectedValueOnce(new Error('no rebase is being planned'));

		expect(await rebase.run()).toBe(false);
		expect(rebase.running).toBe(false);
		expect(rebase.outcome).toBe('failed');
		expect(rebase.runError).toContain('no rebase is being planned');
	});
});

describe('what arrives while it runs', () => {
	beforeEach(async () => {
		await idle();
		handlers.clear();
		rebaseProgress.mockResolvedValue(null);
		rebaseTodo.mockResolvedValue(todoOf());
		rebasePreview.mockResolvedValue(previewOf());
		rebase.upstream = 'main';
		await rebase.load();
	});

	it('follows the step count', async () => {
		const token = await started();

		emit(REBASE_PROGRESS_EVENT, { token, step: 2, total: 5, branch: 'work', original: 'abc1234' });

		expect(rebase.progress).toEqual({
			step: 2,
			total: 5,
			branch: 'work',
			original: 'abc1234'
		});
	});

	it('ignores steps from a rebase that is not the one running', async () => {
		const token = await started(7);

		emit(REBASE_PROGRESS_EVENT, { token: token + 1, step: 9, total: 9, branch: null, original: null });

		expect(rebase.progress).toBeNull();
	});

	it('finishes when git got to the end', async () => {
		const token = await started();
		rebaseProgress.mockResolvedValue(null);

		emit(REBASE_DONE_EVENT, { token, ok: true, stopped: false, error: null });
		await Promise.resolve();

		expect(rebase.running).toBe(false);
		expect(rebase.outcome).toBe('ran');
	});

	it('calls a stop a stop, not a failure', async () => {
		// The distinction the whole hand-off rests on: git exits non-zero both
		// for "I stopped, your turn" and for "this did not work".
		const token = await started();

		emit(REBASE_DONE_EVENT, { token, ok: false, stopped: true, error: null });

		expect(rebase.outcome).toBe('stopped');
	});

	it('reports a real failure with git’s own words', async () => {
		const token = await started();

		emit(REBASE_DONE_EVENT, { token, ok: false, stopped: false, error: 'cannot rebase: you have unstaged changes' });

		expect(rebase.outcome).toBe('failed');
		expect(rebase.runError).toContain('unstaged changes');
	});
});

describe('a rebase that is standing still', () => {
	beforeEach(async () => {
		await idle();
		handlers.clear();
		rebaseContinue.mockResolvedValue(undefined);
		rebaseSkip.mockResolvedValue(undefined);
		rebaseAbort.mockResolvedValue(undefined);
	});

	it('is recognised on arrival, not only after this screen ran one', async () => {
		// A rebase left unfinished by a previous session, or started from the
		// command line, is the screen's state when it opens.
		rebaseProgress.mockResolvedValue({ step: 2, total: 4, branch: 'work', original: 'abc1234' });

		await rebase.refreshProgress();

		expect(rebase.stopped).toBe(true);
		expect(rebase.progress?.step).toBe(2);
	});

	it('continues, and re-reads where that left things', async () => {
		rebaseProgress.mockResolvedValue(null);

		expect(await rebase.continue()).toBe(true);
		expect(rebaseContinue).toHaveBeenCalled();
		// The call's own result cannot say whether the rebase finished or
		// stopped again, so the repository is asked.
		expect(rebase.stopped).toBe(false);
		expect(rebase.outcome).toBe('ran');
	});

	it('knows when continuing stopped it again', async () => {
		rebaseProgress.mockResolvedValue({ step: 3, total: 4, branch: 'work', original: 'abc1234' });

		await rebase.continue();

		expect(rebase.outcome).toBe('stopped');
		expect(rebase.progress?.step).toBe(3);
	});

	it('surfaces a refusal rather than pretending it worked', async () => {
		rebaseProgress.mockResolvedValue({ step: 3, total: 4, branch: 'work', original: 'abc1234' });
		rebaseContinue.mockRejectedValueOnce(new Error('unresolved conflicts'));

		expect(await rebase.continue()).toBe(false);
		expect(rebase.runError).toContain('unresolved conflicts');
	});

	it('skips and aborts through the same path', async () => {
		rebaseProgress.mockResolvedValue(null);

		await rebase.skip();
		expect(rebaseSkip).toHaveBeenCalled();

		await rebase.abort();
		expect(rebaseAbort).toHaveBeenCalled();
	});

	it('refuses a control while the worker is still running', async () => {
		rebaseTodo.mockResolvedValue(todoOf());
		rebasePreview.mockResolvedValue(previewOf());
		rebase.upstream = 'main';
		await rebase.load();
		await started();
		rebaseAbort.mockClear();

		expect(await rebase.abort()).toBe(false);
		expect(rebaseAbort).not.toHaveBeenCalled();
	});
});
