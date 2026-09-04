// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Unit tests for the Farm store (FEAT-073).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Farm, FarmSnapshot, Task } from './types';

let eventHandler: ((event: { payload: unknown }) => void) | null = null;
const unlistenMock = vi.fn();

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn((_name: string, handler: (event: { payload: unknown }) => void) => {
		eventHandler = handler;
		return Promise.resolve(unlistenMock);
	})
}));

vi.mock('./api', () => ({
	open: vi.fn(),
	snapshot: vi.fn(),
	failure: vi.fn((err: unknown) => ({
		kind: 'testError',
		message: typeof err === 'string' ? err : (err as Error)?.message ?? 'failed'
	}))
}));

import * as api from './api';
import { farmStore } from './store.svelte';

const apiOpen = vi.mocked(api.open);
const apiSnapshot = vi.mocked(api.snapshot);

function sampleTask(id: string, overrides: Partial<Task> = {}): Task {
	return {
		id,
		title: `Task ${id}`,
		description: 'A sample task',
		status: 'ready',
		kind: 'general',
		priority: 'normal',
		dependsOn: [],
		allowedPaths: [],
		acceptanceCriteria: [],
		verification: [],
		verificationOverrides: false,
		assignedAgent: null,
		implementedBy: null,
		branch: null,
		worktree: null,
		attempts: 0,
		createdMs: 1000,
		updatedMs: 1000,
		note: null,
		...overrides
	};
}

function sampleFarm(tasks: Task[] = []): Farm {
	return {
		id: 'farm-1',
		repository: '/path/to/repo',
		status: 'running',
		autonomy: 'semiAuto',
		permissions: {
			writeFiles: true,
			runCommands: true,
			network: false,
			commit: true,
			push: false,
			merge: false,
			deleteBranch: false
		},
		goal: {
			id: 'goal-1',
			title: 'A big goal',
			description: 'Doing important things',
			constraints: [],
			createdMs: 1000
		},
		agents: [],
		tasks,
		verification: ['cargo test'],
		maxParallel: 2,
		createdMs: 1000,
		updatedMs: 1000
	};
}

function sampleSnapshot(tasks: Task[] = []): FarmSnapshot {
	return {
		farm: sampleFarm(tasks),
		agents: [
			{
				definition: {
					id: 'claude-1',
					provider: 'claudeCode',
					displayName: 'Claude Code',
					executable: '/usr/bin/claude',
					role: 'architect',
					capabilities: ['planning', 'coding'],
					inputMode: 'cliPrompt',
					traits: {
						resumableSessions: true,
						streaming: true,
						structuredOutput: true,
						toolUse: true,
						headless: true
					},
					enabled: true,
					extraArgs: []
				},
				availability: { state: 'available', path: '/usr/bin/claude', version: '1.0.0' }
			},
			{
				definition: {
					id: 'codex-1',
					provider: 'codex',
					displayName: 'Codex',
					executable: '/usr/bin/codex',
					role: 'backend',
					capabilities: ['coding'],
					inputMode: 'cliPrompt',
					traits: {
						resumableSessions: false,
						streaming: true,
						structuredOutput: true,
						toolUse: true,
						headless: true
					},
					enabled: false,
					extraArgs: []
				},
				availability: { state: 'available', path: '/usr/bin/codex', version: '2.0.0' }
			},
			{
				definition: {
					id: 'cursor-1',
					provider: 'cursor',
					displayName: 'Cursor',
					executable: '/usr/bin/cursor',
					role: 'frontend',
					capabilities: ['coding'],
					inputMode: 'cliPrompt',
					traits: {
						resumableSessions: false,
						streaming: true,
						structuredOutput: false,
						toolUse: true,
						headless: false
					},
					enabled: true,
					extraArgs: []
				},
				availability: { state: 'missing' }
			}
		],
		undetected: ['ohMyPi'],
		runs: [],
		policy: {
			sources: [{ path: 'AGENTS.md', authoritative: true, bytes: 42 }],
			text: '# Rules'
		},
		stale: [],
		scoreboard: [
			{
				agent: 'claude-1',
				completed: 3,
				failed: 0,
				changesRequested: 1,
				successRate: 0.75,
				averageMs: 5000
			}
		],
		events: []
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	eventHandler = null;
	farmStore.reset();
});

describe('farmStore initial & reset state', () => {
	it('starts completely empty', () => {
		expect(farmStore.farm).toBeNull();
		expect(farmStore.tasks).toEqual([]);
		expect(farmStore.agents).toEqual([]);
		expect(farmStore.usable).toEqual([]);
		expect(farmStore.loaded).toBe(false);
		expect(farmStore.loading).toBe(false);
		expect(farmStore.error).toBeNull();
		expect(farmStore.progress).toEqual({ done: 0, total: 0 });
		expect(farmStore.needsYou).toEqual([]);
	});
});

describe('farmStore.open & getters', () => {
	it('loads snapshot and sets loaded state', async () => {
		const t1 = sampleTask('TASK-001', { status: 'done' });
		const t2 = sampleTask('TASK-002', { status: 'running' });
		const t3 = sampleTask('TASK-003', { status: 'review' });
		const snapshot = sampleSnapshot([t1, t2, t3]);

		apiOpen.mockResolvedValueOnce(snapshot);

		await farmStore.open('/my/repo');

		expect(farmStore.loaded).toBe(true);
		expect(farmStore.loading).toBe(false);
		expect(farmStore.farm?.id).toBe('farm-1');
		expect(farmStore.tasks.length).toBe(3);
		expect(farmStore.progress).toEqual({ done: 1, total: 3 });
		expect(farmStore.needsYou.map((t) => t.id)).toEqual(['TASK-003']);
		expect(farmStore.inStatus('running').map((t) => t.id)).toEqual(['TASK-002']);
		expect(farmStore.byId.get('TASK-001')?.title).toBe('Task TASK-001');

		// Usable agents filter by enabled && available
		expect(farmStore.usable.length).toBe(1);
		expect(farmStore.usable[0].definition.id).toBe('claude-1');

		expect(farmStore.undetected).toEqual(['ohMyPi']);
		expect(farmStore.policy.sources.map((s) => s.path)).toEqual(['AGENTS.md']);
		expect(farmStore.scoreboard.length).toBe(1);
	});

	it('records error on failed open', async () => {
		apiOpen.mockRejectedValueOnce(new Error('Permission denied'));

		await farmStore.open('/invalid/path');

		expect(farmStore.loaded).toBe(false);
		expect(farmStore.error).toBe('Permission denied');
	});
});

describe('farmStore events & absorb', () => {
	it('absorbs agentOutput events into transcripts per task', () => {
		farmStore.absorb({
			kind: 'agentOutput',
			task: 'TASK-001',
			run: 'run-1',
			line: 'Compiling project...'
		});
		farmStore.absorb({
			kind: 'agentOutput',
			task: 'TASK-001',
			run: 'run-1',
			line: 'Done.'
		});
		farmStore.absorb({
			kind: 'agentOutput',
			task: 'TASK-002',
			run: 'run-2',
			line: 'Warning: unused'
		});

		expect(farmStore.transcript('TASK-001')).toEqual(['Compiling project...', 'Done.']);
		expect(farmStore.transcript('TASK-002')).toEqual(['Warning: unused']);
		expect(farmStore.transcript('TASK-003')).toEqual([]);
	});

	it('absorbs farmStatusChanged and taskStatusChanged into local farm', async () => {
		const t1 = sampleTask('TASK-001', { status: 'ready' });
		apiOpen.mockResolvedValueOnce(sampleSnapshot([t1]));
		await farmStore.open('/repo');

		farmStore.absorb({
			kind: 'farmStatusChanged',
			status: 'paused'
		});
		expect(farmStore.farm?.status).toBe('paused');

		farmStore.absorb({
			kind: 'taskStatusChanged',
			task: 'TASK-001',
			status: 'running',
			note: 'Agent starting'
		});
		expect(farmStore.tasks[0].status).toBe('running');
		expect(farmStore.tasks[0].note).toBe('Agent starting');
	});
});

describe('farmStore refresh & stop', () => {
	it('refresh updates snapshot without clearing current data on failure', async () => {
		const t1 = sampleTask('TASK-001', { status: 'ready' });
		apiOpen.mockResolvedValueOnce(sampleSnapshot([t1]));
		await farmStore.open('/repo');

		// Successful refresh
		const t1Updated = sampleTask('TASK-001', { status: 'done' });
		apiSnapshot.mockResolvedValueOnce(sampleSnapshot([t1Updated]));
		await farmStore.refresh();
		expect(farmStore.tasks[0].status).toBe('done');

		// Failed refresh records error but keeps data
		apiSnapshot.mockRejectedValueOnce(new Error('Network disconnected'));
		await farmStore.refresh();
		expect(farmStore.error).toBe('Network disconnected');
		expect(farmStore.tasks.length).toBe(1);
	});

	it('stop cleans up event listener and clears error', async () => {
		apiOpen.mockResolvedValueOnce(sampleSnapshot([]));
		await farmStore.open('/repo');

		farmStore.fail('Something went wrong');
		expect(farmStore.error).toBe('Something went wrong');

		farmStore.clearError();
		expect(farmStore.error).toBeNull();

		await farmStore.stop();
		expect(unlistenMock).toHaveBeenCalled();
	});
});
