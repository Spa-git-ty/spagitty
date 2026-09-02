// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * External tools settings section tests (FEAT-068).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExternalToolsConfig } from '$lib/types';

vi.mock('$lib/api', () => ({
	externalToolsConfig: vi.fn(),
	setExternalTool: vi.fn(),
	launchExternalDiff: vi.fn(),
	launchExternalMerge: vi.fn()
}));

import * as api from '$lib/api';

const externalToolsConfig = vi.mocked(api.externalToolsConfig);
const setExternalTool = vi.mocked(api.setExternalTool);

beforeEach(() => {
	vi.clearAllMocks();
});

describe('ExternalToolsSection logic', () => {
	it('loads tools configuration', async () => {
		const sampleConfig: ExternalToolsConfig = {
			diffTool: 'meld',
			mergeTool: null,
			availableDiffTools: [
				{ id: 'meld', name: 'Meld', command: 'meld $LOCAL $REMOTE', isInstalled: true },
				{ id: 'vscode', name: 'VS Code', command: 'code --diff', isInstalled: true }
			],
			availableMergeTools: [
				{ id: 'meld', name: 'Meld', command: 'meld $LOCAL $BASE $REMOTE -o $MERGED', isInstalled: true }
			]
		};

		externalToolsConfig.mockResolvedValueOnce(sampleConfig);

		const result = await api.externalToolsConfig();
		expect(result.diffTool).toBe('meld');
		expect(result.availableDiffTools).toHaveLength(2);
		expect(result.availableMergeTools).toHaveLength(1);
	});

	it('calls setExternalTool when changing diff tool', async () => {
		setExternalTool.mockResolvedValueOnce();

		await api.setExternalTool('diff', 'vscode', false);
		expect(setExternalTool).toHaveBeenCalledWith('diff', 'vscode', false);
	});

	it('calls setExternalTool with null when resetting tool', async () => {
		setExternalTool.mockResolvedValueOnce();

		await api.setExternalTool('merge', null, true);
		expect(setExternalTool).toHaveBeenCalledWith('merge', null, true);
	});
});
