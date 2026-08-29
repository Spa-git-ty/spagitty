// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GIT_COMMAND_EVENT, type ExecutedCommand } from '$lib/types';

/** Handlers registered by `commandLog.attach`, keyed by event name. */
const handlers = new Map<string, (event: { payload: unknown }) => void>();
const unlisten = vi.fn();

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn((name: string, handler: (event: { payload: unknown }) => void) => {
		handlers.set(name, handler);
		return Promise.resolve(unlisten);
	})
}));

const gitCommands = vi.fn((_since: number) => Promise.resolve([] as ExecutedCommand[]));
const clearGitCommands = vi.fn(() => Promise.resolve());
/** Flipped by the one test that asks what happens with no backend behind it. */
let inBrowserOnly = false;
vi.mock('$lib/api', () => ({
	inTauri: () => !inBrowserOnly,
	gitCommands: (since: number) => gitCommands(since),
	clearGitCommands: () => clearGitCommands()
}));

const failed = vi.fn();
vi.mock('$lib/ui/notice.svelte', () => ({
	notice: {
		ok: vi.fn(),
		failed: (title: string, error: unknown) => failed(title, error)
	}
}));

import { CAPACITY, commandLog, line, transcript } from '$lib/commandlog/store.svelte';

function ran(seq: number, ...argv: string[]): ExecutedCommand {
	return {
		seq,
		atMs: 1_700_000_000_000 + seq,
		argv: ['git', ...argv],
		outcome: { kind: 'ok' },
		durationMs: 4
	};
}

function emit(entry: ExecutedCommand): void {
	const handler = handlers.get(GIT_COMMAND_EVENT);
	if (!handler) throw new Error('nothing subscribed to ' + GIT_COMMAND_EVENT);
	handler({ payload: entry });
}

describe('the command log', () => {
	beforeEach(async () => {
		handlers.clear();
		gitCommands.mockClear();
		clearGitCommands.mockClear();
		failed.mockClear();
		unlisten.mockClear();

		await commandLog.clear();
		commandLog.hide();
		await commandLog.attach();
	});

	it('collects executions as they are emitted', () => {
		emit(ran(1, 'fetch', '--prune'));
		emit(ran(2, 'push', '--force-with-lease'));

		expect(commandLog.entries.map((entry) => entry.seq)).toEqual([1, 2]);
		expect(commandLog.latest?.argv).toContain('--force-with-lease');
	});

	it('keeps one entry when the event and the catch-up read overlap', async () => {
		// Both paths can carry the same execution, and they must not double it:
		// the sequence number is the identity, not the text.
		emit(ran(7, 'status'));
		gitCommands.mockResolvedValueOnce([ran(7, 'status'), ran(8, 'log')]);

		await commandLog.refresh();

		expect(commandLog.entries.map((entry) => entry.seq)).toEqual([7, 8]);
	});

	it('asks only for what it does not already have', async () => {
		emit(ran(12, 'status'));

		await commandLog.refresh();

		expect(gitCommands).toHaveBeenCalledWith(12);
	});

	it('holds no more than the buffer on the other side of the boundary', () => {
		for (let seq = 1; seq <= CAPACITY + 25; seq += 1) emit(ran(seq, 'status'));

		expect(commandLog.entries).toHaveLength(CAPACITY);
		expect(commandLog.entries[0].seq).toBe(26);
		expect(commandLog.latest?.seq).toBe(CAPACITY + 25);
	});

	it('orders by sequence even when an entry arrives late', () => {
		emit(ran(3, 'status'));
		emit(ran(1, 'fetch'));
		emit(ran(2, 'log'));

		expect(commandLog.entries.map((entry) => entry.seq)).toEqual([1, 2, 3]);
	});

	it('opening reads what ran before anyone was looking', async () => {
		gitCommands.mockResolvedValueOnce([ran(1, 'fetch', '--prune')]);

		await commandLog.show();

		expect(commandLog.open).toBe(true);
		expect(commandLog.entries).toHaveLength(1);

		commandLog.hide();
		expect(commandLog.open).toBe(false);
	});

	it('says so when the record cannot be read, rather than showing an empty panel', async () => {
		gitCommands.mockRejectedValueOnce(new Error('no backend'));

		await commandLog.refresh();

		expect(failed).toHaveBeenCalledWith('Could not read the command log', expect.anything());
	});

	it('clearing empties the panel and the buffer behind it', async () => {
		emit(ran(1, 'status'));

		await commandLog.clear();

		expect(commandLog.entries).toHaveLength(0);
		expect(clearGitCommands).toHaveBeenCalled();
	});

	it('toggling opens and closes it', async () => {
		await commandLog.toggle();
		expect(commandLog.open).toBe(true);

		await commandLog.toggle();
		expect(commandLog.open).toBe(false);
	});

	it('says so when the record cannot be cleared', async () => {
		clearGitCommands.mockRejectedValueOnce(new Error('no backend'));

		await commandLog.clear();

		expect(failed).toHaveBeenCalledWith('Could not clear the command log', expect.anything());
	});

	it('asks the backend for nothing when there is no backend', async () => {
		// The dev server in a plain browser: the panel is inert rather than
		// throwing on every open.
		inBrowserOnly = true;
		// The shared setup runs with a backend present, so its own calls are
		// forgotten here rather than counted against this test.
		gitCommands.mockClear();
		clearGitCommands.mockClear();
		try {
			await commandLog.refresh();
			await commandLog.clear();

			expect(gitCommands).not.toHaveBeenCalled();
			expect(clearGitCommands).not.toHaveBeenCalled();
			expect(failed).not.toHaveBeenCalled();
		} finally {
			inBrowserOnly = false;
		}
	});

	it('detaches its listener', async () => {
		const off = await commandLog.attach();
		off();

		expect(unlisten).toHaveBeenCalled();
	});
});

describe('rendering a command as text', () => {
	it('quotes an argument that would otherwise become two', () => {
		const entry: ExecutedCommand = {
			...ran(1, 'commit', '-m'),
			argv: ['git', 'commit', '-m', 'fix the thing']
		};

		expect(line(entry)).toBe('git commit -m "fix the thing"');
	});

	it('escapes a quote inside an argument', () => {
		const entry: ExecutedCommand = {
			...ran(1),
			argv: ['git', 'commit', '-m', 'say "no"']
		};

		expect(line(entry)).toBe('git commit -m "say \\"no\\""');
	});

	it('leaves an ordinary argument alone', () => {
		expect(line(ran(1, 'fetch', '--prune', '--all'))).toBe('git fetch --prune --all');
	});

	it('writes the whole log oldest first, one command per line', () => {
		expect(transcript([ran(1, 'fetch'), ran(2, 'push')])).toBe('git fetch\ngit push');
	});
});
