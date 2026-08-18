// SPDX-License-Identifier: GPL-3.0-or-later

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClonePlan, CloneDoneEvent, CloneProgressEvent } from '$lib/types';

vi.mock('$lib/api', () => ({
	inTauri: vi.fn(() => true),
	clonePlan: vi.fn(),
	cloneStart: vi.fn(),
	cloneRelease: vi.fn(() => Promise.resolve())
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));

/** Captured listeners, so an event can be delivered from a test. */
const listeners = new Map<string, (event: { payload: unknown }) => void>();
vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn((name: string, handler: (event: { payload: unknown }) => void) => {
		listeners.set(name, handler);
		return Promise.resolve(() => listeners.delete(name));
	})
}));

vi.mock('$lib/repo.svelte', async () => await import('../../testing/repo-store.svelte'));

import * as api from '$lib/api';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { calls as repoCalls, control as repoControl } from '../../testing/repo-store.svelte';
import { clone } from './store.svelte';

const clonePlan = vi.mocked(api.clonePlan);
const cloneStart = vi.mocked(api.cloneStart);
const cloneRelease = vi.mocked(api.cloneRelease);
const chooseDialog = vi.mocked(openDialog);

function aPlan(overrides: Partial<ClonePlan> = {}): ClonePlan {
	return {
		name: 'project',
		destination: '/work/project',
		createsDestination: true,
		problem: null,
		message: null,
		...overrides
	};
}

/** Deliver an event the way the Rust side would. */
function emit(name: string, payload: CloneProgressEvent | CloneDoneEvent): void {
	const handler = listeners.get(name);
	if (!handler) throw new Error(`nothing is listening for ${name}`);
	handler({ payload });
}

/** Get to a running clone, which most of these start from. */
async function startClone(token = 7): Promise<void> {
	clone.setUrl('https://example.com/owner/project.git');
	await vi.waitFor(() => expect(clone.runnable).toBe(true));
	cloneStart.mockResolvedValueOnce(token);
	await clone.start();
}

beforeEach(async () => {
	vi.clearAllMocks();
	listeners.clear();
	clone.clear();
	repoControl.reset();
	clonePlan.mockResolvedValue(aPlan());
	await clone.attach();
});

describe('planning', () => {
	it('recomputes where the clone will land as the address is typed', async () => {
		clone.setUrl('https://example.com/owner/project.git');
		await vi.waitFor(() => expect(clone.plan.destination).toBe('/work/project'));

		expect(clonePlan).toHaveBeenCalledWith('https://example.com/owner/project.git', '');
	});

	it('shows the exact destination rather than a description of it', async () => {
		// Criterion 2. A clone that lands somewhere other than what the screen
		// said is a repository the user will not find again.
		clone.setUrl('https://example.com/owner/project.git');
		await vi.waitFor(() => expect(clone.plan.destination).toBe('/work/project'));

		expect(clone.runnable).toBe(true);
	});

	it('refuses a destination that is already occupied, before anything runs', async () => {
		// Criterion 3.
		clonePlan.mockResolvedValue(
			aPlan({
				problem: { kind: 'destinationNotEmpty', detail: '/work/project' },
				message: '/work/project already exists and is not empty. Nothing has been changed.',
				createsDestination: false
			})
		);
		clone.setUrl('https://example.com/owner/project.git');
		await vi.waitFor(() => expect(clone.plan.problem).not.toBeNull());

		expect(clone.runnable).toBe(false);
		expect(clone.plan.message).toContain('Nothing has been changed');
	});

	it('shows the reason the core gave rather than one of its own', async () => {
		clonePlan.mockResolvedValue(
			aPlan({ problem: { kind: 'noParent' }, message: 'Choose the folder to clone into.' })
		);
		clone.setUrl('x');
		await vi.waitFor(() => expect(clone.plan.message).toBe('Choose the folder to clone into.'));
	});

	it('drops a plan a newer keystroke superseded', async () => {
		let release!: (plan: ClonePlan) => void;
		clonePlan.mockReturnValueOnce(new Promise((resolve) => (release = resolve)));

		clone.setUrl('https://example.com/owner/slow.git');
		clone.setUrl('https://example.com/owner/project.git');
		release(aPlan({ destination: '/work/slow' }));
		await vi.waitFor(() => expect(clone.plan.destination).toBe('/work/project'));
	});

	it('replans after choosing a folder', async () => {
		chooseDialog.mockResolvedValueOnce('/work');
		await clone.chooseParent();

		expect(clone.parent).toBe('/work');
		expect(clonePlan).toHaveBeenCalledWith('', '/work');
	});

	it('changes nothing when the folder dialog is dismissed', async () => {
		chooseDialog.mockResolvedValueOnce(null);
		await clone.chooseParent();

		expect(clone.parent).toBe('');
	});
});

describe('running', () => {
	it('starts a clone and remembers the token its progress carries', async () => {
		await startClone(7);

		expect(cloneStart).toHaveBeenCalledWith('https://example.com/owner/project.git', '');
		expect(clone.running).toBe(true);
	});

	it('refuses to start when the plan is refused', async () => {
		clonePlan.mockResolvedValue(
			aPlan({ problem: { kind: 'noUrl' }, message: 'Paste the address.' })
		);
		clone.setUrl('');
		await vi.waitFor(() => expect(clone.runnable).toBe(false));

		await clone.start();

		expect(cloneStart).not.toHaveBeenCalled();
	});

	it('reports git’s own progress as it arrives', async () => {
		await startClone(7);

		emit('clone-progress', {
			token: 7,
			phase: 'Receiving objects',
			percent: 57,
			line: 'Receiving objects:  57% (123/456)'
		});

		expect(clone.step?.phase).toBe('Receiving objects');
		expect(clone.step?.percent).toBe(57);
	});

	it('ignores progress from a clone that is no longer the one running', async () => {
		await startClone(7);

		emit('clone-progress', { token: 6, phase: 'Stale', percent: 10, line: 'Stale: 10%' });

		expect(clone.step).toBeNull();
	});

	it('keeps git’s words when there is no percentage to show', async () => {
		// "working…" is worse than whatever git actually said.
		await startClone(7);

		emit('clone-progress', {
			token: 7,
			phase: 'Cloning into',
			percent: null,
			line: "Cloning into 'project'..."
		});

		expect(clone.step?.line).toContain('Cloning into');
	});

	it('does not start a second clone while one is running', async () => {
		await startClone(7);
		await clone.start();

		expect(cloneStart).toHaveBeenCalledTimes(1);
	});

	it('records a refusal from Rust without pretending a clone started', async () => {
		clone.setUrl('https://example.com/owner/project.git');
		await vi.waitFor(() => expect(clone.runnable).toBe(true));
		cloneStart.mockRejectedValueOnce('a clone is already running');

		await clone.start();

		expect(clone.running).toBe(false);
		expect(clone.error).toContain('already running');
	});
});

describe('finishing', () => {
	it('offers to open what was cloned, and only then', async () => {
		await startClone(7);

		emit('clone-done', {
			token: 7,
			ok: true,
			cancelled: false,
			error: null,
			path: '/work/project'
		});

		expect(clone.running).toBe(false);
		expect(clone.cloned).toBe('/work/project');
		expect(cloneRelease).toHaveBeenCalled();
	});

	it('opens the path it was given rather than one it re-derived', async () => {
		// Criterion 7. Opening is also what puts it in the repository list, so
		// criterion 8 falls out of the same call.
		await startClone(7);
		emit('clone-done', {
			token: 7,
			ok: true,
			cancelled: false,
			error: null,
			path: '/work/project'
		});

		await clone.openCloned();

		expect(repoCalls.opened).toEqual(['/work/project']);
		expect(clone.open).toBe(false);
	});

	it('keeps the offer when opening fails', async () => {
		await startClone(7);
		emit('clone-done', {
			token: 7,
			ok: true,
			cancelled: false,
			error: null,
			path: '/work/project'
		});
		repoControl.failNextOpen();

		await clone.openCloned();

		expect(clone.cloned).toBe('/work/project');
	});

	it('shows git’s own message when the clone failed', async () => {
		await startClone(7);

		emit('clone-done', {
			token: 7,
			ok: false,
			cancelled: false,
			error: "fatal: repository 'https://example.com/owner/project.git' not found",
			path: '/work/project'
		});

		expect(clone.error).toContain('not found');
		expect(clone.cloned).toBeNull();
	});

	it('leaves nothing to open after a failure, so no entry is added', async () => {
		// Criterion 8: the repository list is written by opening, and a failed
		// clone is never opened.
		await startClone(7);
		emit('clone-done', {
			token: 7,
			ok: false,
			cancelled: false,
			error: 'fatal: could not read from remote repository',
			path: '/work/project'
		});

		expect(await clone.openCloned()).toBe(false);
		expect(repoCalls.opened).toEqual([]);
	});

	it('does not report a cancellation as a failure', async () => {
		// The user asked for it, so they already know.
		await startClone(7);
		await clone.cancel();

		emit('clone-done', {
			token: 7,
			ok: false,
			cancelled: true,
			error: 'The clone was stopped.',
			path: '/work/project'
		});

		expect(clone.error).toBeNull();
	});

	it('stops the clone and asks Rust to let go of it', async () => {
		// Criterion 6's frontend half; the removal itself is Rust's, and only
		// when the clone created the directory.
		await startClone(7);

		await clone.cancel();

		expect(cloneRelease).toHaveBeenCalled();
		expect(clone.running).toBe(false);
		expect(clone.step).toBeNull();
	});

	it('replans after a cancellation, because the destination may be gone again', async () => {
		await startClone(7);
		clonePlan.mockClear();

		await clone.cancel();

		expect(clonePlan).toHaveBeenCalled();
	});
});

describe('the modal', () => {
	it('opens and closes without touching a running clone', async () => {
		// The modal is a view of the clone, not the clone itself.
		clone.show();
		await startClone(7);

		clone.hide();

		expect(clone.open).toBe(false);
		expect(clone.running).toBe(true);
		expect(cloneRelease).not.toHaveBeenCalled();
	});
});
