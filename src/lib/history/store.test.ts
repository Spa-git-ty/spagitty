// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * File history and blame store tests (FEAT-063).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Blame, FileHistoryEntry } from '$lib/types';

vi.mock('$lib/api', () => ({
	fileHistory: vi.fn(),
	blame: vi.fn()
}));

import * as api from '$lib/api';
import { fileHistory } from './store.svelte';

const apiFileHistory = vi.mocked(api.fileHistory);
const apiBlame = vi.mocked(api.blame);

beforeEach(() => {
	vi.clearAllMocks();
	fileHistory.reset();
});

describe('fileHistory store', () => {
	it('starts in an empty state', () => {
		expect(fileHistory.path).toBe(null);
		expect(fileHistory.revision).toBe('HEAD');
		expect(fileHistory.entries).toEqual([]);
		expect(fileHistory.blame).toBe(null);
		expect(fileHistory.loading).toBe(false);
		expect(fileHistory.error).toBe(null);
		expect(fileHistory.highlightedCommit).toBe(null);
	});

	it('inspects a file and fetches both history and blame', async () => {
		const sampleEntries: FileHistoryEntry[] = [
			{
				commit: '1a2b3c4d5e',
				short: '1a2b3c4',
				authorName: 'Ada Lovelace',
				authorEmail: 'ada@example.com',
				time: 1700000000,
				summary: 'Add feature'
			}
		];
		const sampleBlame: Blame = {
			path: 'src/main.rs',
			revision: '1a2b3c4d5e',
			lines: [
				{
					line: 1,
					text: 'fn main() {}',
					commit: '1a2b3c4d5e',
					short: '1a2b3c4',
					summary: 'Add feature',
					authorName: 'Ada Lovelace',
					time: 1700000000,
					sourcePath: null
				}
			],
			refused: null
		};

		apiFileHistory.mockResolvedValueOnce(sampleEntries);
		apiBlame.mockResolvedValueOnce(sampleBlame);

		await fileHistory.inspect('src/main.rs', 'HEAD');

		expect(fileHistory.path).toBe('src/main.rs');
		expect(fileHistory.revision).toBe('HEAD');
		expect(fileHistory.entries).toEqual(sampleEntries);
		expect(fileHistory.blame).toEqual(sampleBlame);
		expect(fileHistory.loading).toBe(false);
		expect(fileHistory.error).toBe(null);
	});

	it('sets and clears commit highlight', () => {
		fileHistory.setHighlight('1a2b3c4d');
		expect(fileHistory.highlightedCommit).toBe('1a2b3c4d');

		fileHistory.setHighlight(null);
		expect(fileHistory.highlightedCommit).toBe(null);
	});

	it('handles errors cleanly', async () => {
		apiFileHistory.mockRejectedValueOnce(new Error('path does not exist'));
		apiBlame.mockResolvedValueOnce({
			path: 'missing.txt',
			revision: 'HEAD',
			lines: [],
			refused: 'notAFile'
		});

		await fileHistory.inspect('missing.txt', 'HEAD');

		expect(fileHistory.error).toBe('path does not exist');
		expect(fileHistory.loading).toBe(false);
	});
});
