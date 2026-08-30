// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Worktrees store unit tests (FEAT-062).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Worktree } from '$lib/types';

vi.mock('$lib/api', () => ({
	worktrees: vi.fn(),
	worktreeAdd: vi.fn(),
	worktreeRemove: vi.fn(),
	worktreeLock: vi.fn(),
	worktreeUnlock: vi.fn(),
	worktreePrune: vi.fn()
}));

import * as api from '$lib/api';
import { worktrees } from './store.svelte';

const apiList = vi.mocked(api.worktrees);
const apiAdd = vi.mocked(api.worktreeAdd);
const apiRemove = vi.mocked(api.worktreeRemove);
const apiLock = vi.mocked(api.worktreeLock);
const apiUnlock = vi.mocked(api.worktreeUnlock);
const apiPrune = vi.mocked(api.worktreePrune);

function sampleWorktree(name: string, overrides: Partial<Worktree> = {}): Worktree {
	return {
		path: `/home/user/project/${name}`,
		name,
		head: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
		headShort: '1a2b3c4',
		branch: 'main',
		isMain: name === 'project',
		isBare: false,
		isDetached: false,
		lockedReason: null,
		prunableReason: null,
		...overrides
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	worktrees.reset();
});

describe('worktrees store', () => {
	it('starts in an empty uninitialized state', () => {
		expect(worktrees.list).toEqual([]);
		expect(worktrees.loaded).toBe(false);
		expect(worktrees.loading).toBe(false);
		expect(worktrees.error).toBe(null);
		expect(worktrees.count).toBe(0);
	});

	it('fetches and populates worktrees list', async () => {
		const main = sampleWorktree('project', { isMain: true });
		const linked = sampleWorktree('feature-x', { isMain: false, branch: 'feature-x' });
		apiList.mockResolvedValueOnce([main, linked]);

		const result = await worktrees.fetch();
		expect(result).toHaveLength(2);
		expect(worktrees.list).toHaveLength(2);
		expect(worktrees.loaded).toBe(true);
		expect(worktrees.loading).toBe(false);
		expect(worktrees.main).toEqual(main);
		expect(worktrees.linked).toEqual([linked]);
	});

	it('handles fetch errors cleanly', async () => {
		apiList.mockRejectedValueOnce(new Error('git execution failed'));

		const result = await worktrees.fetch();
		expect(result).toEqual([]);
		expect(worktrees.error).toBe('git execution failed');
		expect(worktrees.loading).toBe(false);
		expect(worktrees.loaded).toBe(false);
	});

	it('adds a new worktree and refreshes the list', async () => {
		const newWt = sampleWorktree('feature-new', { isMain: false, branch: 'feature-new' });
		apiAdd.mockResolvedValueOnce(newWt);
		apiList.mockResolvedValueOnce([sampleWorktree('project', { isMain: true }), newWt]);

		const added = await worktrees.add('/path/to/feature-new', null, 'feature-new', false);
		expect(added).toEqual(newWt);
		expect(apiAdd).toHaveBeenCalledWith('/path/to/feature-new', null, 'feature-new', false);
		expect(apiList).toHaveBeenCalled();
	});

	it('removes a worktree and refreshes the list', async () => {
		apiRemove.mockResolvedValueOnce();
		apiList.mockResolvedValueOnce([sampleWorktree('project', { isMain: true })]);

		const ok = await worktrees.remove('/path/to/feature-new', true);
		expect(ok).toBe(true);
		expect(apiRemove).toHaveBeenCalledWith('/path/to/feature-new', true);
		expect(apiList).toHaveBeenCalled();
	});

	it('locks and unlocks a worktree', async () => {
		apiLock.mockResolvedValueOnce();
		apiList.mockResolvedValueOnce([]);

		await worktrees.lock('/path/to/wt', 'in use');
		expect(apiLock).toHaveBeenCalledWith('/path/to/wt', 'in use');

		apiUnlock.mockResolvedValueOnce();
		apiList.mockResolvedValueOnce([]);

		await worktrees.unlock('/path/to/wt');
		expect(apiUnlock).toHaveBeenCalledWith('/path/to/wt');
	});

	it('prunes stale worktrees', async () => {
		apiPrune.mockResolvedValueOnce();
		apiList.mockResolvedValueOnce([]);

		const ok = await worktrees.prune();
		expect(ok).toBe(true);
		expect(apiPrune).toHaveBeenCalled();
	});
});
