// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it, vi } from 'vitest';
import { click, render } from '../../testing/mount';
import TaskRow from './components/TaskRow.svelte';
import type { Task } from './types';

/**
 * The queue explaining itself (FEAT-075).
 *
 * The row is where a person looks first, so it is where the answer to "why is
 * this not moving" has to be. What is asserted here is the order the three
 * possible answers come in, and that a draft can be picked without also being
 * selected.
 */

function task(id: string, overrides: Partial<Task> = {}): Task {
	return {
		id,
		title: `Task ${id}`,
		description: '',
		kind: 'general',
		status: 'ready',
		priority: 'normal',
		dependsOn: [],
		allowedPaths: ['src/**'],
		acceptanceCriteria: [],
		verification: [],
		verificationOverrides: false,
		assignedAgent: null,
		implementedBy: null,
		branch: null,
		worktree: null,
		attempts: 0,
		note: null,
		createdMs: 0,
		updatedMs: 0,
		origin: { kind: 'person' },
		...overrides
	} as unknown as Task;
}

function props(overrides: Record<string, unknown> = {}) {
	return {
		task: task('T-1'),
		selected: false,
		byId: new Map<string, Task>(),
		blocked: null,
		pick: null,
		onselect: vi.fn(),
		...overrides
	} as never;
}

describe('a task row that is not moving', () => {
	it('says what the scheduler says', () => {
		const view = render(
			TaskRow,
			props({ blocked: 'T-3 is working on the same files.' })
		);

		expect(view.text()).toContain('T-3 is working on the same files.');

		view.destroy();
	});

	it('falls back to the dependency it can work out itself', () => {
		// The backend deliberately does not answer this one: the screen has the
		// whole task list, and two places writing one sentence is how they come
		// to disagree.
		const view = render(
			TaskRow,
			props({
				task: task('T-2', { dependsOn: ['T-1'] }),
				byId: new Map([['T-1', task('T-1', { status: 'running' })]])
			})
		);

		expect(view.text()).toContain('Waiting for T-1');

		view.destroy();
	});

	it('puts the task’s own note above anything general', () => {
		// A verification failure is about this task; "no free agent" is not.
		const view = render(
			TaskRow,
			props({
				task: task('T-1', { status: 'blocked', note: 'Verification failed: cargo test' }),
				blocked: 'No free agent — 2 of 2 are working.'
			})
		);

		expect(view.text()).toContain('Verification failed: cargo test');
		expect(view.text()).not.toContain('No free agent');

		view.destroy();
	});

	it('offers no explanation at all when the task is simply running', () => {
		const view = render(TaskRow, props({ task: task('T-1', { status: 'running' }) }));

		expect(view.all('.reason')).toHaveLength(0);

		view.destroy();
	});
});

describe('a task that was broken down', () => {
	it('reads as a heading with a fraction rather than a kind', () => {
		const view = render(
			TaskRow,
			props({ task: task('T-1'), progress: { done: 2, total: 5 } })
		);

		expect(view.text()).toContain('2 of 5');
		// The kind chip is what the fraction replaces: a heading's kind of work
		// is whatever its children are.
		expect(view.text()).not.toContain('General');

		view.destroy();
	});

	it('is indented by how deep it sits', () => {
		const view = render(TaskRow, props({ depth: 2 }));

		expect(view.get('.row').style.getPropertyValue('--depth')).toBe('2');

		view.destroy();
	});

	it('is an ordinary row when nothing was cut out of it', () => {
		const view = render(TaskRow, props({ progress: { done: 0, total: 0 } }));

		expect(view.text()).toContain('General');
		expect(view.text()).not.toContain('0 of 0');

		view.destroy();
	});
});

describe('who asked for a task', () => {
	it('leaves a person’s own work unmarked', () => {
		// Most rows in most farms are theirs; a mark on everything marks nothing.
		const view = render(TaskRow, props());

		expect(view.find('.mark')).toBeNull();
		view.destroy();
	});

	it('marks a task an agent asked for, and says who and why', () => {
		const view = render(
			TaskRow,
			props({
				task: task('T-1', { origin: { kind: 'planned', agent: 'claude' } })
			})
		);

		const mark = view.get('.mark');
		expect(mark.title).toBe('claude cut this out of the goal.');
		view.destroy();
	});

	it('says which task a subtask was cut out of', () => {
		const view = render(
			TaskRow,
			props({
				task: task('T-9', { origin: { kind: 'subtask', agent: 'codex', parent: 'T-2' } })
			})
		);

		expect(view.get('.mark').title).toBe('codex cut this out of T-2.');
		view.destroy();
	});

	it('says plainly that nobody asked for a proposal', () => {
		const view = render(
			TaskRow,
			props({
				task: task('T-4', { origin: { kind: 'proposed', agent: 'claude', from: 'T-1' } })
			})
		);

		expect(view.get('.mark').title).toContain('Nobody asked for it');
		view.destroy();
	});
});

describe('picking proposed tasks', () => {
	it('picks a draft without selecting the row', () => {
		const ontoggle = vi.fn();
		const onselect = vi.fn();
		const view = render(
			TaskRow,
			props({
				task: task('T-1', { status: 'draft' }),
				pick: { on: true, ontoggle },
				onselect
			})
		);

		click(view.get('.pick'));

		expect(ontoggle).toHaveBeenCalledOnce();
		// The two are different gestures and both are wanted.
		expect(onselect).not.toHaveBeenCalled();

		view.destroy();
	});

	it('has no checkbox on a task that is not being picked', () => {
		const view = render(TaskRow, props());

		expect(view.find('.pick')).toBeNull();

		view.destroy();
	});
});
