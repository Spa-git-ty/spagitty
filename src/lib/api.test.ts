// SPDX-License-Identifier: GPL-3.0-or-later

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(() => Promise.resolve()) }));

import { invoke } from '@tauri-apps/api/core';
import * as api from './api';

const invoked = vi.mocked(invoke);

beforeEach(() => {
	invoked.mockClear();
	invoked.mockResolvedValue(undefined);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

/**
 * These tests are about the wire contract, not about behaviour: the command
 * names and argument keys have to match `src-tauri/src/commands.rs` exactly,
 * and a rename on either side is silent at compile time because `invoke` takes
 * a string. That is what makes them worth asserting.
 */
describe('command names and arguments', () => {
	it('sends the path when opening a repository', async () => {
		await api.openRepo('/repos/fixture');
		expect(invoked).toHaveBeenCalledWith('open_repo', { path: '/repos/fixture' });
	});

	it('closes without arguments', async () => {
		await api.closeRepo();
		expect(invoked).toHaveBeenCalledWith('close_repo');
	});

	it('sends the token and the count when asking for rows', async () => {
		await api.graphRequest(3, 600);
		expect(invoked).toHaveBeenCalledWith('graph_request', { token: 3, count: 600 });
	});

	it('restarts the walk without arguments', async () => {
		await api.graphRestart();
		expect(invoked).toHaveBeenCalledWith('graph_restart');
	});

	it('takes a snapshot without arguments', async () => {
		await api.snapshot();
		expect(invoked).toHaveBeenCalledWith('snapshot');
	});

	it('sends the id for commit detail', async () => {
		await api.commitDetail('abc');
		expect(invoked).toHaveBeenCalledWith('commit_detail', { id: 'abc' });
	});

	it('sends the id for a commit diff', async () => {
		await api.commitDiff('abc');
		expect(invoked).toHaveBeenCalledWith('commit_diff', { id: 'abc' });
	});

	it('sends the id and the path for a file diff', async () => {
		await api.fileDiff('abc', 'src/main.rs');
		expect(invoked).toHaveBeenCalledWith('file_diff', { id: 'abc', path: 'src/main.rs' });
	});

	it('asks for the build identity without arguments', async () => {
		await api.about();
		expect(invoked).toHaveBeenCalledWith('about');
	});

	it('asks for the launch path without arguments', async () => {
		await api.launchPath();
		expect(invoked).toHaveBeenCalledWith('launch_path');
	});

	it('asks Rust for the shared metrics without arguments', async () => {
		await api.metrics();
		expect(invoked).toHaveBeenCalledWith('metrics');
	});

	it('uses snake_case names, matching the Rust command functions', async () => {
		await api.openRepo('/x');
		await api.graphRequest(1, 1);
		await api.commitDetail('x');

		for (const call of invoked.mock.calls) {
			expect(call[0]).toMatch(/^[a-z]+(_[a-z]+)*$/);
		}
	});
});

describe('results', () => {
	it('passes the result through untouched', async () => {
		const about = { version: '0.1.0', commit: 'abc1234', license: 'GPL-3.0-or-later' };
		invoked.mockResolvedValueOnce(about);
		expect(await api.about()).toEqual(about);
	});

	it('lets a rejection through rather than swallowing it', async () => {
		invoked.mockRejectedValueOnce('no repository is open');
		await expect(api.snapshot()).rejects.toBe('no repository is open');
	});
});

describe('inTauri', () => {
	it('is false in a plain browser', () => {
		expect(api.inTauri()).toBe(false);
	});

	it('is true when the webview injected its internals', () => {
		vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
		expect(api.inTauri()).toBe(true);
	});

	it('does not throw where there is no window at all', () => {
		vi.stubGlobal('window', undefined);
		expect(() => api.inTauri()).not.toThrow();
	});
});
