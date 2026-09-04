// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it, vi } from 'vitest';
import { click, render } from '../../testing/mount';
import AgentStrip from './components/AgentStrip.svelte';
import ProgressRing from './components/ProgressRing.svelte';
import { QUIET_AFTER_MS, quietLine } from './describe';
import { actorKind } from './delight';
import type { AgentRun, Task } from './types';

/**
 * A farm worth watching (FEAT-077).
 *
 * The three promises: the ring says where the work is without being read, the
 * strip says who is doing what, and a run that has gone quiet says so — while
 * never being stopped on the strength of it.
 */

const NOW = 1_700_000_000_000;

function run(overrides: Partial<AgentRun> = {}): AgentRun {
	return {
		id: 'run-1',
		task: 'TASK-0001',
		agent: 'claude',
		phase: 'implementation',
		outcome: { state: 'running' },
		command: ['claude -p'],
		startedMs: NOW - 60_000,
		endedMs: null,
		logFile: null,
		lastOutputMs: NOW - 1_000,
		...overrides
	};
}

function task(id: string): Task {
	return { id, title: `Task ${id}` } as unknown as Task;
}

describe('the progress ring', () => {
	it('says where the work is, for a reader who cannot see colour', () => {
		const view = render(ProgressRing, { done: 3, running: 2, blocked: 1, total: 7 } as never);

		// The accessible name is the whole sentence; the ring is the glance.
		expect(view.get('.ring').getAttribute('aria-label')).toBe(
			'3 of 7 done, 2 running, 1 needing you'
		);
		expect(view.text()).toContain('3/7');

		view.destroy();
	});

	it('does not claim anything about a farm with no tasks', () => {
		const view = render(ProgressRing, { done: 0, running: 0, blocked: 0, total: 0 } as never);

		expect(view.get('.ring').getAttribute('aria-label')).toBe('No tasks yet');

		view.destroy();
	});

	it('colours the remainder only when something is stuck', () => {
		const moving = render(ProgressRing, { done: 1, running: 1, blocked: 0, total: 4 } as never);
		expect(moving.get('.rest').classList.contains('stuck')).toBe(false);
		moving.destroy();

		const stuck = render(ProgressRing, { done: 1, running: 0, blocked: 1, total: 4 } as never);
		expect(stuck.get('.rest').classList.contains('stuck')).toBe(true);
		stuck.destroy();
	});
});

describe('the agent strip', () => {
	it('says who is doing what, and for how long', () => {
		const view = render(AgentStrip, {
			runs: [run()],
			byId: new Map([['TASK-0001', task('TASK-0001')]]),
			now: NOW,
			onselect: vi.fn()
		} as never);

		expect(view.text()).toContain('claude');
		expect(view.text()).toContain('Task TASK-0001');
		expect(view.text()).toContain('1m 0s');

		view.destroy();
	});

	it('is not there at all when nothing is running', () => {
		const view = render(AgentStrip, {
			runs: [run({ outcome: { state: 'completed', exitCode: 0 } })],
			byId: new Map(),
			now: NOW,
			onselect: vi.fn()
		} as never);

		// An empty shelf is worse than no shelf.
		expect(view.find('.strip')).toBeNull();

		view.destroy();
	});

	it('marks a run that has gone quiet, and stops its pulse', () => {
		const view = render(AgentStrip, {
			runs: [run({ lastOutputMs: NOW - QUIET_AFTER_MS - 1_000 })],
			byId: new Map(),
			now: NOW,
			onselect: vi.fn()
		} as never);

		expect(view.get('.agent').classList.contains('quiet')).toBe(true);
		// The animation is the message: the one that stopped moving is the one
		// to look at.
		expect(view.get('.dot').classList.contains('still')).toBe(true);
		expect(view.get('.agent').title).toContain('No output for');

		view.destroy();
	});

	it('takes you to the task it names', () => {
		const onselect = vi.fn();
		const view = render(AgentStrip, {
			runs: [run()],
			byId: new Map(),
			now: NOW,
			onselect
		} as never);

		click(view.get('.agent'));

		expect(onselect).toHaveBeenCalledWith('TASK-0001');

		view.destroy();
	});
});

describe('when a run has gone quiet', () => {
	it('says nothing about a run that is talking', () => {
		expect(quietLine(run(), NOW)).toBeNull();
	});

	it('says nothing about a finished run, however long ago it spoke', () => {
		// A finished run is not quiet, it is finished.
		expect(
			quietLine(run({ outcome: { state: 'completed', exitCode: 0 }, lastOutputMs: 0 }), NOW)
		).toBeNull();
	});

	it('measures from when it started if it has never said anything', () => {
		// The case this exists for: an agent that produced no output at all
		// looks exactly like one that died on its first second.
		const line = quietLine(run({ lastOutputMs: null, startedMs: NOW - QUIET_AFTER_MS - 1 }), NOW);
		expect(line).toContain('No output for');
	});

	it('holds its tongue until the threshold', () => {
		expect(quietLine(run({ lastOutputMs: NOW - QUIET_AFTER_MS + 1_000 }), NOW)).toBeNull();
		expect(quietLine(run({ lastOutputMs: NOW - QUIET_AFTER_MS - 1_000 }), NOW)).not.toBeNull();
	});
});

describe('the delight seam', () => {
	it('recognises the agents the layer draws, and calls the rest agents', () => {
		expect(actorKind('claude')).toBe('claude');
		expect(actorKind('codex')).toBe('codex');
		expect(actorKind('my-gpt-runner')).toBe('gpt');
		// A custom agent is an agent. Not being able to name its model is not a
		// reason to refuse it a record.
		expect(actorKind('some-inhouse-thing')).toBe('agent');
	});
});
