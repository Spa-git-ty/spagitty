// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Blame, BlameLine, CommitDetail, SearchRow } from '$lib/types';

const listeners = new Map<string, (event: { payload: unknown }) => void>();

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn((name: string, handler: (event: { payload: unknown }) => void) => {
		listeners.set(name, handler);
		return Promise.resolve(() => listeners.delete(name));
	})
}));

vi.mock('$lib/api', () => ({
	searchStart: vi.fn(),
	searchStop: vi.fn(() => Promise.resolve()),
	blame: vi.fn(),
	commitDetail: vi.fn()
}));

import * as api from '$lib/api';
import { search } from './store.svelte';

const searchStart = vi.mocked(api.searchStart);
const blameCall = vi.mocked(api.blame);
const commitDetail = vi.mocked(api.commitDetail);

function row(index: number, overrides: Partial<SearchRow> = {}): SearchRow {
	return {
		index,
		id: `${index}`.padStart(40, 'a'),
		short: `aaaaaa${index}`,
		summary: `Commit ${index}`,
		authorName: 'Ada Lovelace',
		authorEmail: 'ada@example.com',
		initials: 'AL',
		time: 1_700_000_000 - index,
		refs: [],
		...overrides
	};
}

function blameLine(line: number, overrides: Partial<BlameLine> = {}): BlameLine {
	return {
		line,
		text: `line ${line}`,
		commit: 'a'.repeat(40),
		short: 'aaaaaaa',
		summary: 'A commit',
		authorName: 'Ada Lovelace',
		time: 1_700_000_000,
		sourcePath: null,
		...overrides
	};
}

function detail(id: string): CommitDetail {
	return {
		id,
		short: id.slice(0, 7),
		summary: 'Merge feature/split-view',
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

/** Deliver a batch as the worker would. */
function emitRows(token: number, rows: SearchRow[]) {
	listeners.get('search-rows')?.({ payload: { token, rows } });
}

function emitDone(token: number, overrides: Partial<{ total: number; complete: boolean; error: string | null }> = {}) {
	listeners.get('search-done')?.({
		payload: { token, total: 0, complete: true, error: null, ...overrides }
	});
}

beforeEach(async () => {
	vi.clearAllMocks();
	listeners.clear();
	await search.stop();
	searchStart.mockResolvedValue(1);
	commitDetail.mockImplementation((id: string) => Promise.resolve(detail(id)));
	await search.attach();
});

describe('the query', () => {
	it('is refused while nothing is being asked', async () => {
		expect(search.empty).toBe(true);

		await search.run();

		expect(searchStart).not.toHaveBeenCalled();
		expect(search.ran).toBe(false);
	});

	it('sends the fields as filters, trimmed', async () => {
		search.author = '  ada  ';
		search.message = 'line';

		await search.run();

		expect(searchStart).toHaveBeenCalledWith({
			author: 'ada',
			message: 'line',
			path: null,
			since: null,
			until: null
		});
	});

	it('a whitespace-only field is not a filter', async () => {
		search.author = '   ';

		expect(search.empty).toBe(true);
		expect(search.chips).toEqual([]);
	});

	it('turns a date field into seconds, with until covering the whole day', async () => {
		search.since = '2024-01-01';
		search.until = '2024-01-01';

		await search.run();

		const sent = searchStart.mock.calls[0][0];
		expect(sent.since).toBe(Date.parse('2024-01-01T00:00:00Z') / 1000);
		expect(sent.until).toBe(Date.parse('2024-01-01T23:59:59Z') / 1000);
	});

	it('ignores a date that is not a date rather than sending nonsense', async () => {
		search.since = 'last tuesday';
		search.message = 'x';

		await search.run();

		expect(searchStart.mock.calls[0][0].since).toBeNull();
	});

	it('shows one chip per filter, saying exactly what is applied', () => {
		search.author = 'ada';
		search.path = 'core.txt';
		search.message = 'line';

		expect(search.chips.map((chip) => chip.label)).toEqual([
			'author:ada',
			'path:core.txt',
			'message:line'
		]);
	});

	it('removing a chip clears its field and re-runs what is left', async () => {
		search.author = 'ada';
		search.message = 'line';
		await search.run();
		searchStart.mockClear();

		await search.removeChip('author');

		expect(search.author).toBe('');
		expect(searchStart).toHaveBeenCalledWith(
			expect.objectContaining({ author: null, message: 'line' })
		);
	});

	it('removing the last chip clears the results instead of running nothing', async () => {
		search.message = 'line';
		await search.run();
		searchStart.mockClear();

		await search.removeChip('message');

		expect(searchStart).not.toHaveBeenCalled();
		expect(search.ran).toBe(false);
		expect(search.count).toBe(0);
	});

	it('records a failure to start', async () => {
		searchStart.mockRejectedValue(new Error('no repository is open'));
		search.message = 'line';

		await search.run();

		expect(search.error).toContain('no repository is open');
		expect(search.running).toBe(false);
	});
});

describe('streaming', () => {
	beforeEach(async () => {
		search.message = 'line';
		await search.run();
	});

	it('shows rows as they arrive rather than waiting for the walk to end', () => {
		emitRows(1, [row(0), row(1)]);

		expect(search.count).toBe(2);
		expect(search.running).toBe(true);
		expect(search.rows().map((r) => r.summary)).toEqual(['Commit 0', 'Commit 1']);
	});

	it('drops rows from a superseded query', async () => {
		emitRows(1, [row(0)]);
		searchStart.mockResolvedValue(2);
		await search.run();

		emitRows(1, [row(0), row(1)]);

		// The old walk cannot write into the new results.
		expect(search.count).toBe(0);
	});

	it('ends running when the walk reports done', () => {
		emitRows(1, [row(0)]);
		emitDone(1, { total: 1 });

		expect(search.running).toBe(false);
		expect(search.complete).toBe(true);
	});

	it('a cancelled walk is not complete, so the count is not the whole answer', () => {
		emitDone(1, { complete: false });

		expect(search.complete).toBe(false);
	});

	it('carries a walk failure through to the screen', () => {
		emitDone(1, { complete: false, error: 'could not walk the history: broken' });

		expect(search.error).toContain('could not walk the history');
	});

	it('a done event from an older query is ignored', async () => {
		searchStart.mockResolvedValue(2);
		await search.run();

		emitDone(1, { complete: true });

		// The current query is still going.
		expect(search.running).toBe(true);
	});

	it('names the narrowest filter of the query the rows answer', async () => {
		search.path = 'core.txt';
		await search.run();

		expect(search.narrowestApplied).toBe('path:core.txt');
	});

	it('names the narrowest filter as it was when the query ran, not as it is typed now', async () => {
		// Otherwise "nothing matched, and path:x is the narrowest" would name a
		// filter the results were never asked about.
		search.path = 'core.txt';
		await search.run();
		search.path = 'something-else.txt';

		expect(search.narrowestApplied).toBe('path:core.txt');
	});
});

describe('opening a result', () => {
	beforeEach(async () => {
		search.message = 'line';
		await search.run();
		emitRows(1, [row(0), row(1)]);
	});

	it('reads the commit it opened', async () => {
		await search.select(row(1).id);

		expect(search.selectedId).toBe(row(1).id);
		expect(search.detail?.id).toBe(row(1).id);
	});

	it('drops a superseded detail read', async () => {
		let release!: (value: CommitDetail) => void;
		commitDetail.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));

		const first = search.select(row(0).id);
		await search.select(row(1).id);
		release(detail(row(0).id));
		await first;

		expect(search.detail?.id).toBe(row(1).id);
	});

	it('records a failed detail read', async () => {
		commitDetail.mockRejectedValue(new Error('no commit abc'));

		await search.select(row(0).id);

		expect(search.detailError).toContain('no commit abc');
		expect(search.detail).toBeNull();
	});

	it('a new query drops what was open', async () => {
		await search.select(row(0).id);

		await search.run();

		expect(search.selectedId).toBeNull();
		expect(search.detail).toBeNull();
	});
});

describe('blame', () => {
	it('reads a file at a revision', async () => {
		blameCall.mockResolvedValue({
			path: 'core.txt',
			revision: 'a'.repeat(40),
			lines: [blameLine(1), blameLine(2)],
			refused: null
		} satisfies Blame);

		await search.loadBlame('core.txt', 'v0.1.0');

		expect(blameCall).toHaveBeenCalledWith('core.txt', 'v0.1.0');
		expect(search.blame?.lines).toHaveLength(2);
		expect(search.blamePath).toBe('core.txt');
	});

	it('an empty revision is passed through as HEAD is the default', async () => {
		blameCall.mockResolvedValue({
			path: 'core.txt',
			revision: 'a'.repeat(40),
			lines: [],
			refused: 'empty'
		});

		await search.loadBlame('core.txt');

		expect(blameCall).toHaveBeenCalledWith('core.txt', '');
	});

	it('carries a refusal rather than an empty list', async () => {
		// An empty list reads as a file nobody has ever touched, which is a
		// different and much stranger claim.
		blameCall.mockResolvedValue({
			path: 'logo.bin',
			revision: 'a'.repeat(40),
			lines: [],
			refused: 'binary'
		});

		await search.loadBlame('logo.bin');

		expect(search.blame?.refused).toBe('binary');
	});

	it('refuses to blame nothing', async () => {
		await search.loadBlame('   ');

		expect(blameCall).not.toHaveBeenCalled();
	});

	it('drops a superseded blame', async () => {
		let release!: (value: Blame) => void;
		blameCall.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));
		blameCall.mockResolvedValue({
			path: 'b.txt',
			revision: 'b'.repeat(40),
			lines: [blameLine(1)],
			refused: null
		});

		const first = search.loadBlame('a.txt');
		await search.loadBlame('b.txt');
		release({ path: 'a.txt', revision: 'a'.repeat(40), lines: [], refused: null });
		await first;

		expect(search.blamePath).toBe('b.txt');
		expect(search.blame?.path).toBe('b.txt');
	});

	it('records a failure', async () => {
		blameCall.mockRejectedValue(new Error('no repository is open'));

		await search.loadBlame('core.txt');

		expect(search.blameError).toContain('no repository is open');
		expect(search.blame).toBeNull();
	});
});

describe('leaving', () => {
	it('stops the walk and forgets both the query and the results', async () => {
		search.message = 'line';
		await search.run();
		emitRows(1, [row(0)]);

		await search.stop();

		expect(api.searchStop).toHaveBeenCalled();
		expect(search.message).toBe('');
		expect(search.count).toBe(0);
		expect(search.ran).toBe(false);
	});
});
