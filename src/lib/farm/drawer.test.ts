// SPDX-License-Identifier: GPL-3.0-or-later

import { flushSync as flush } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { click, render } from '../../testing/mount';
import ActivityDrawer from './components/ActivityDrawer.svelte';
import DrawerHarness from '../../testing/DrawerHarness.svelte';
import type { RecordedEvent, Task } from './types';

/**
 * The farm's log drawer (FEAT-074).
 *
 * What is asserted is what the drawer promises and the strip it replaced could
 * not do: times on every line, a scrollback rather than the last six, a filter,
 * a transcript beside the activity, and a hold that does not lose what arrives
 * while it is held.
 */

/** 14:02:11 on an arbitrary day, in whatever zone the test runs in. */
function at(hour: number, minute: number, second: number): number {
	const when = new Date(2026, 8, 4, hour, minute, second);
	return when.getTime();
}

function created(id: string, when: number): RecordedEvent {
	return { atMs: when, kind: 'taskCreated', task: id, title: `Task ${id}` };
}

function status(id: string, when: number): RecordedEvent {
	return { atMs: when, kind: 'taskStatusChanged', task: id, status: 'running', note: null };
}

function task(id: string): Task {
	return {
		id,
		title: `Task ${id}`,
		description: '',
		kind: 'general',
		status: 'ready',
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
		note: null,
		createdMs: 0,
		updatedMs: 0
	} as unknown as Task;
}

function props(overrides: Record<string, unknown> = {}) {
	return {
		events: [],
		tasks: [],
		transcript: () => [],
		selected: null,
		planning: false,
		collapsed: false,
		ontoggle: vi.fn(),
		...overrides
	} as never;
}

describe('the activity drawer', () => {
	it('puts a time on every line', () => {
		const view = render(
			ActivityDrawer,
			props({ events: [created('T-1', at(14, 2, 11))], tasks: [task('T-1')] })
		);

		expect(view.text()).toContain('14:02:11');
		expect(view.text()).toContain('T-1 created');

		view.destroy();
	});

	it('keeps more than a screenful, which the strip it replaced could not', () => {
		// The strip showed the last six lines and dropped the rest on the floor.
		const events = Array.from({ length: 40 }, (_, index) =>
			created(`T-${index}`, at(14, 0, index))
		);
		const view = render(ActivityDrawer, props({ events, tasks: [] }));

		expect(view.all('.line')).toHaveLength(40);
		expect(view.text()).toContain('40 lines');

		view.destroy();
	});

	it('filters to one task', () => {
		const view = render(
			ActivityDrawer,
			props({
				events: [created('T-1', at(14, 0, 1)), created('T-2', at(14, 0, 2))],
				tasks: [task('T-1'), task('T-2')]
			})
		);

		const picker = view.get('.picker') as HTMLSelectElement;
		// Only tasks that have said something are offered — a filter that
		// returns nothing is not a filter worth offering.
		expect([...picker.options].map((option) => option.value)).toEqual(['', 'T-1', 'T-2']);

		view.destroy();
	});

	it('reads one task’s transcript beside the activity', () => {
		const view = render(
			ActivityDrawer,
			props({
				events: [status('T-1', at(14, 0, 1))],
				tasks: [task('T-1')],
				selected: 'T-1',
				transcript: (id: string) => (id === 'T-1' ? ['· Read src/auth.rs'] : [])
			})
		);

		expect(view.text()).not.toContain('· Read src/auth.rs');
		click(view.all('.tab')[1]);
		expect(view.text()).toContain('· Read src/auth.rs');
		// And the activity is not mixed into it.
		expect(view.text()).not.toContain('14:00:01');

		view.destroy();
	});

	it('says what to do when there is nothing to read yet', () => {
		const view = render(ActivityDrawer, props());
		expect(view.text()).toContain('Nothing has happened yet');

		click(view.all('.tab')[1]);
		expect(view.text()).toContain('Pick a task');

		view.destroy();
	});

	it('holds the list still, and says how much arrived while it was held', () => {
		// Mounted through a harness because the behaviour is about events that
		// arrive *after* the drawer is on screen, which fixed props cannot say.
		let push: (event: RecordedEvent) => void = () => {};
		const view = render(DrawerHarness, {
			events: [created('T-1', at(14, 0, 1))],
			tasks: [task('T-1')],
			register: (fn: (event: RecordedEvent) => void) => (push = fn)
		} as never);

		// Without holding, a new event lands.
		push(created('T-2', at(14, 0, 2)));
		flush();
		expect(view.all('.line')).toHaveLength(2);

		click(view.get('.control'));
		push(created('T-3', at(14, 0, 3)));
		flush();

		// Still two lines on screen, and a count of what is waiting.
		expect(view.all('.line')).toHaveLength(2);
		expect(view.text()).toContain('1 new');

		// Releasing catches up.
		click(view.get('.control'));
		flush();
		expect(view.all('.line')).toHaveLength(3);
		expect(view.text()).not.toContain('1 new');

		view.destroy();
	});

	it('collapses to its bar, and asks to be expanded again', () => {
		const ontoggle = vi.fn();
		const view = render(ActivityDrawer, props({ collapsed: true, ontoggle }));

		// The tabs stay; the log does not.
		expect(view.all('.tab')).toHaveLength(2);
		expect(view.all('.line')).toHaveLength(0);

		const controls = view.all('.control');
		click(controls[controls.length - 1]);
		expect(ontoggle).toHaveBeenCalledOnce();

		view.destroy();
	});

	it('shows no time for an event recorded before times existed', () => {
		// `atMs` is zero for every line written before FEAT-074. 1970 would be
		// a lie; a blank is the truth.
		const view = render(ActivityDrawer, props({ events: [created('T-1', 0)] }));

		expect(view.text()).not.toContain('1970');
		expect(view.text()).toContain('T-1 created');

		view.destroy();
	});
});
