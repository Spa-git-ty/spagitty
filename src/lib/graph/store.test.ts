// SPDX-License-Identifier: GPL-3.0-or-later

import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	GRAPH_DONE_EVENT,
	GRAPH_ROWS_EVENT,
	type CommitDetail,
	type GraphDoneEvent,
	type GraphRow,
	type GraphRowsEvent
} from '$lib/types';

/** Handlers registered by `graph.attach`, keyed by event name. */
const handlers = new Map<string, (event: { payload: unknown }) => void>();
const unlisten = vi.fn();

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn((name: string, handler: (event: { payload: unknown }) => void) => {
		handlers.set(name, handler);
		return Promise.resolve(unlisten);
	})
}));

vi.mock('$lib/api', () => ({
	graphRequest: vi.fn(() => Promise.resolve()),
	graphRestart: vi.fn(() => Promise.resolve(1)),
	commitDetail: vi.fn()
}));

/** A stand-in for the repo store: the graph only reads its token and reports back. */
const repoState = { token: 0 as number | null, commitCount: 0 };
vi.mock('$lib/repo.svelte', () => ({
	repo: {
		get token() {
			return repoState.token;
		},
		setToken: (next: number) => void (repoState.token = next),
		setCommitCount: (n: number) => void (repoState.commitCount = n)
	}
}));

import * as api from '$lib/api';
import { graph } from './store.svelte';

const graphRequest = vi.mocked(api.graphRequest);
const graphRestart = vi.mocked(api.graphRestart);
const commitDetail = vi.mocked(api.commitDetail);

function row(index: number, id = `${index}`.padStart(40, 'a')): GraphRow {
	return {
		index,
		id,
		short: id.slice(0, 7),
		summary: `commit ${index}`,
		authorName: 'Ada Lovelace',
		authorEmail: 'ada@example.com',
		initials: 'AL',
		time: 1_700_000_000 - index * 60,
		lane: 0,
		color: 0,
		signed: false,
		parents: [],
		refs: [],
		edges: []
	};
}

function detail(id: string): CommitDetail {
	return {
		id,
		short: id.slice(0, 7),
		summary: 'a commit',
		body: '',
		authorName: 'Ada Lovelace',
		authorEmail: 'ada@example.com',
		authorTime: 1_700_000_000,
		committerName: 'Ada Lovelace',
		committerEmail: 'ada@example.com',
		commitTime: 1_700_000_000,
		signed: false,
		parents: [],
		files: []
	};
}

function emitRows(payload: GraphRowsEvent) {
	handlers.get(GRAPH_ROWS_EVENT)?.({ payload });
}

function emitDone(payload: GraphDoneEvent) {
	handlers.get(GRAPH_DONE_EVENT)?.({ payload });
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

let detach: () => void;

beforeEach(async () => {
	vi.clearAllMocks();
	handlers.clear();
	repoState.token = 0;
	repoState.commitCount = 0;
	graph.clear();
	graphRequest.mockResolvedValue(undefined);
	graphRestart.mockResolvedValue(1);
	commitDetail.mockImplementation((id) => Promise.resolve(detail(id)));
	detach = await graph.attach();
});

describe('attach', () => {
	it('subscribes to both events and detaches both', () => {
		expect(handlers.has(GRAPH_ROWS_EVENT)).toBe(true);
		expect(handlers.has(GRAPH_DONE_EVENT)).toBe(true);

		detach();
		expect(unlisten).toHaveBeenCalledTimes(2);
	});
});

describe('streaming rows', () => {
	it('stores rows at their absolute index and reports the count', () => {
		emitRows({ token: 0, rows: [row(0), row(1)] });

		expect(graph.count).toBe(2);
		expect(graph.row(1)?.index).toBe(1);
		expect(repoState.commitCount).toBe(2);
	});

	it('bumps the version so consumers know to re-read', () => {
		const before = graph.version;
		emitRows({ token: 0, rows: [row(0)] });
		expect(graph.version).toBeGreaterThan(before);
	});

	it('accepts batches out of order without losing rows', () => {
		emitRows({ token: 0, rows: [row(5)] });
		emitRows({ token: 0, rows: [row(0)] });

		expect(graph.count).toBe(6);
		expect(graph.row(5)).toBeDefined();
		expect(graph.row(0)).toBeDefined();
		expect(graph.row(3)).toBeUndefined();
	});

	it('drops rows from a superseded walk', () => {
		emitRows({ token: 0, rows: [row(0)] });
		emitRows({ token: 99, rows: [row(1)] });

		expect(graph.count).toBe(1);
		expect(graph.row(1)).toBeUndefined();
	});

	it('drops a done event from a superseded walk', () => {
		emitDone({ token: 99, total: 0, complete: true, error: null });
		expect(graph.complete).toBe(false);
	});
});

describe('done', () => {
	it('marks the walk complete', () => {
		emitRows({ token: 0, rows: [row(0)] });
		emitDone({ token: 0, total: 1, complete: true, error: null });

		expect(graph.complete).toBe(true);
		expect(graph.error).toBeNull();
	});

	it('does not mark a cancelled walk complete', () => {
		emitDone({ token: 0, total: 0, complete: false, error: null });
		expect(graph.complete).toBe(false);
	});

	it('records an error from the walk', () => {
		emitDone({ token: 0, total: 0, complete: false, error: 'could not walk the history' });
		expect(graph.error).toBe('could not walk the history');
	});

	/**
	 * FEAT-040 — the footer says how old what is on screen is, and "old" is
	 * measured from the walk finishing rather than from the process starting or
	 * from the last row arriving.
	 */
	it('dates the walk when it completes', () => {
		const before = Math.floor(Date.now() / 1000);

		emitRows({ token: 0, rows: [row(0)] });
		expect(graph.refreshedAt).toBeNull();

		emitDone({ token: 0, total: 1, complete: true, error: null });

		expect(graph.refreshedAt).not.toBeNull();
		expect(graph.refreshedAt!).toBeGreaterThanOrEqual(before);
	});

	it('does not date a walk that was cancelled', () => {
		emitDone({ token: 0, total: 0, complete: false, error: null });
		expect(graph.refreshedAt).toBeNull();
	});
});

/**
 * FEAT-040 — what the graph's footer is allowed to say.
 *
 * The two lines it used to carry told the user how to operate the screen they
 * were already operating, which is the copy TASK-007 and TASK-009 removed
 * everywhere else. The assertions read the screen's source because the footer is
 * markup in a route, and a route is not a component this suite mounts.
 */
describe('the graph footer', () => {
	const page = readFileSync('src/routes/+page.svelte', 'utf8');
	const footer = page.slice(page.indexOf('<footer'), page.indexOf('</footer>'));

	it('no longer explains the screen to the person using it', () => {
		expect(footer).not.toMatch(/drag a branch|right-click a row|double-click a row/i);
	});

	it('says how much is changed, when it refreshed, and when it was fetched', () => {
		expect(footer).toMatch(/changed file/);
		expect(footer).toMatch(/refreshed \{refreshed\}/);
		expect(footer).toMatch(/\{fetched\}/);
	});

	it('has a word for a repository that has never been fetched', () => {
		// An empty time, or a time invented for a fetch that never happened, is
		// the thing this must not do.
		expect(page).toMatch(/never fetched/);
	});

	it('has a word for a working copy that has not been read', () => {
		expect(footer).toMatch(/working copy not read yet/);
	});
});

describe('restart', () => {
	it('clears the rows and asks for the first window', async () => {
		emitRows({ token: 0, rows: [row(0), row(1)] });
		await graph.restart();

		expect(graph.count).toBe(0);
		expect(graph.row(0)).toBeUndefined();
		expect(graphRequest).toHaveBeenCalledWith(0, 600);
	});

	it('does nothing without an open repository', async () => {
		repoState.token = null;
		await graph.restart();
		expect(graphRequest).not.toHaveBeenCalled();
	});

	it('records a failure to ask for rows', async () => {
		graphRequest.mockRejectedValueOnce('no repository is open');
		await graph.restart();
		expect(graph.error).toBe('no repository is open');
	});
});

describe('reload', () => {
	it('keeps the old rows on screen until the new walk delivers', async () => {
		emitRows({ token: 0, rows: [row(0), row(1)] });
		graphRestart.mockResolvedValueOnce(7);

		await graph.reload();

		// Clearing here is what makes a refresh flash, so it must not have.
		expect(graph.count).toBe(2);
		expect(repoState.token).toBe(7);

		emitRows({ token: 7, rows: [row(0)] });
		expect(graph.count).toBe(1);
	});

	it('clears the old rows even when the new walk produces none', async () => {
		emitRows({ token: 0, rows: [row(0), row(1)] });
		graphRestart.mockResolvedValueOnce(7);
		await graph.reload();

		emitDone({ token: 7, total: 0, complete: true, error: null });

		expect(graph.count).toBe(0);
	});

	it('records a failure and does not leave a reset pending', async () => {
		emitRows({ token: 0, rows: [row(0)] });
		graphRestart.mockRejectedValueOnce('could not walk the history');

		await graph.reload();

		expect(graph.error).toBe('could not walk the history');
		expect(graph.count).toBe(1);
	});

	it('follows the selected commit to its new row', async () => {
		emitRows({ token: 0, rows: [row(0, 'kept'), row(1)] });
		graph.select(0);
		await settle();

		graphRestart.mockResolvedValueOnce(7);
		await graph.reload();

		// The commit moved down a row: something landed on top of it.
		emitRows({ token: 7, rows: [row(0), row(1, 'kept')] });

		expect(graph.selectedIndex).toBe(1);
		expect(graph.selected?.id).toBe('kept');
	});

	it('drops the selection when the commit never reappears', async () => {
		emitRows({ token: 0, rows: [row(0, 'rewritten')] });
		graph.select(0);
		await settle();

		graphRestart.mockResolvedValueOnce(7);
		await graph.reload();
		emitRows({ token: 7, rows: [row(0, 'something-else')] });
		emitDone({ token: 7, total: 1, complete: true, error: null });

		expect(graph.selectedIndex).toBeNull();
		expect(graph.detail).toBeNull();
	});
});

describe('ensure', () => {
	it('asks for more rows as the viewport approaches the end of the walk', async () => {
		await graph.restart();
		graphRequest.mockClear();

		graph.ensure(400); // 400 + 300 prefetch >= 600 requested
		expect(graphRequest).toHaveBeenCalledWith(0, 2000);
	});

	it('does not ask again while the walk is far ahead of the scroll', async () => {
		await graph.restart();
		graphRequest.mockClear();

		graph.ensure(10);
		expect(graphRequest).not.toHaveBeenCalled();
	});

	it('stops asking once the walk is complete', async () => {
		await graph.restart();
		emitDone({ token: 0, total: 1, complete: true, error: null });
		graphRequest.mockClear();

		graph.ensure(10_000);
		expect(graphRequest).not.toHaveBeenCalled();
	});

	it('does nothing without an open repository', () => {
		repoState.token = null;
		graph.ensure(10_000);
		expect(graphRequest).not.toHaveBeenCalled();
	});

	it('records a failed request', async () => {
		await graph.restart();
		graphRequest.mockRejectedValueOnce('no repository is open');
		graph.ensure(400);
		await settle();
		expect(graph.error).toBe('no repository is open');
	});
});

describe('select', () => {
	it('selects a row and loads its detail', async () => {
		emitRows({ token: 0, rows: [row(0, 'chosen')] });
		graph.select(0);

		expect(graph.selectedIndex).toBe(0);
		expect(graph.selected?.id).toBe('chosen');
		// The panel clears first, so the previous commit's detail is never shown
		// under the new commit's heading.
		expect(graph.detail).toBeNull();

		await settle();
		expect(graph.detail?.id).toBe('chosen');
	});

	it('ignores a row the walk has not reached', () => {
		graph.select(42);
		expect(graph.selectedIndex).toBeNull();
		expect(commitDetail).not.toHaveBeenCalled();
	});

	it('records a detail error', async () => {
		emitRows({ token: 0, rows: [row(0)] });
		commitDetail.mockRejectedValueOnce('no commit');
		graph.select(0);
		await settle();

		expect(graph.detailError).toBe('no commit');
		expect(graph.detail).toBeNull();
	});

	it('drops a slow detail load that a newer selection superseded', async () => {
		emitRows({ token: 0, rows: [row(0, 'first'), row(1, 'second')] });

		let resolveSlow!: (value: CommitDetail) => void;
		commitDetail.mockReturnValueOnce(
			new Promise<CommitDetail>((resolve) => (resolveSlow = resolve))
		);

		graph.select(0);
		graph.select(1);
		await settle();

		resolveSlow(detail('first'));
		await settle();

		expect(graph.detail?.id).toBe('second');
	});
});

describe('clear', () => {
	it('forgets rows, selection and detail', async () => {
		emitRows({ token: 0, rows: [row(0)] });
		graph.select(0);
		await settle();

		graph.clear();

		expect(graph.count).toBe(0);
		expect(graph.selectedIndex).toBeNull();
		expect(graph.selected).toBeNull();
		expect(graph.detail).toBeNull();
		expect(graph.detailError).toBeNull();
		expect(graph.error).toBeNull();
		expect(graph.complete).toBe(false);
	});
});
