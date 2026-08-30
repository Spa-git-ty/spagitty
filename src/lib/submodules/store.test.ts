// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Submodules store unit tests (FEAT-067).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Submodule } from '$lib/types';

vi.mock('$lib/api', () => ({
	submodules: vi.fn(),
	submoduleUpdate: vi.fn(),
	submoduleSync: vi.fn(),
	submoduleDeinit: vi.fn()
}));

import * as api from '$lib/api';
import { submodules } from './store.svelte';

const apiSubmodules = vi.mocked(api.submodules);
const apiUpdate = vi.mocked(api.submoduleUpdate);
const apiSync = vi.mocked(api.submoduleSync);
const apiDeinit = vi.mocked(api.submoduleDeinit);

function sampleSubmodule(name: string, overrides: Partial<Submodule> = {}): Submodule {
	return {
		name,
		path: `vendor/${name}`,
		url: `https://example.com/${name}.git`,
		headCommit: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
		headShort: '1a2b3c4',
		initialized: true,
		inSync: true,
		hasConflict: false,
		describe: 'v1.0.0',
		...overrides
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	submodules.reset();
});

describe('submodules store', () => {
	it('starts in an empty uninitialized state', () => {
		expect(submodules.list).toEqual([]);
		expect(submodules.loaded).toBe(false);
		expect(submodules.loading).toBe(false);
		expect(submodules.error).toBe(null);
		expect(submodules.count).toBe(0);
	});

	it('fetches and computes submodule counts', async () => {
		const inSync = sampleSubmodule('lib-a', { inSync: true });
		const uninit = sampleSubmodule('lib-b', { initialized: false, inSync: false });
		const drifted = sampleSubmodule('lib-c', { initialized: true, inSync: false });

		apiSubmodules.mockResolvedValueOnce([inSync, uninit, drifted]);

		const result = await submodules.fetch();
		expect(result).toHaveLength(3);
		expect(submodules.list).toHaveLength(3);
		expect(submodules.count).toBe(3);
		expect(submodules.uninitializedCount).toBe(1);
		expect(submodules.driftedCount).toBe(1);
		expect(submodules.loaded).toBe(true);
	});

	it('updates submodules and refreshes list', async () => {
		apiUpdate.mockResolvedValueOnce('Submodule path vendor/lib: checked out 1a2b3c4');
		apiSubmodules.mockResolvedValueOnce([sampleSubmodule('lib')]);

		const output = await submodules.update(['vendor/lib'], true, true);
		expect(output).toContain('checked out');
		expect(apiUpdate).toHaveBeenCalledWith(['vendor/lib'], true, true);
		expect(apiSubmodules).toHaveBeenCalled();
	});

	it('syncs submodule URLs', async () => {
		apiSync.mockResolvedValueOnce('Synchronizing submodule url for vendor/lib');
		apiSubmodules.mockResolvedValueOnce([]);

		const output = await submodules.sync(true);
		expect(output).toContain('Synchronizing');
		expect(apiSync).toHaveBeenCalledWith(true);
	});

	it('deinitializes a submodule', async () => {
		apiDeinit.mockResolvedValueOnce('Cleared directory vendor/lib');
		apiSubmodules.mockResolvedValueOnce([]);

		const output = await submodules.deinit('vendor/lib', true);
		expect(output).toContain('Cleared');
		expect(apiDeinit).toHaveBeenCalledWith('vendor/lib', true);
	});

	it('handles fetch errors cleanly', async () => {
		apiSubmodules.mockRejectedValueOnce(new Error('git command failed'));

		const res = await submodules.fetch();
		expect(res).toEqual([]);
		expect(submodules.error).toBe('git command failed');
		expect(submodules.loading).toBe(false);
	});
});
