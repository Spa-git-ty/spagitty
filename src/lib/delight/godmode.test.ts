// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * God mode (FEAT-072).
 *
 * These are the only writes in the application that bypass the engine, which
 * makes two things worth holding. They must reach the record — a testing tool
 * that quietly does nothing is worse than none, because it makes the thing
 * being tested look broken. And they must not leak: a preview writes nothing,
 * and every demo below has to be an event the application really produces.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BADGES } from './badges';
import { DEMOS, expand } from './demo';
import { LIMITS } from './engine';
import { delight } from './store.svelte';
import { standings } from './standings';

beforeEach(() => {
	localStorage.clear();
	delight.clear();
	delight.bind('/repos/one');
});

afterEach(() => {
	delight.clear();
	localStorage.clear();
});

describe('preview', () => {
	it('queues a card without earning anything', () => {
		delight.preview('git-lord');

		expect(delight.waiting).toBe(1);
		expect(delight.me.earned).toEqual([]);
	});

	it('will show a shame badge, which nothing else does', () => {
		// The whole point of the grid: every card has to be *lookable at*, and
		// the anti-badges are the ones most worth checking the wording of.
		delight.preview('main-character');

		delight.advance();
		expect(delight.showing?.badge.id).toBe('main-character');
	});

	it('ignores a badge id that does not exist', () => {
		delight.preview('not-a-badge');

		expect(delight.waiting).toBe(0);
	});
});

describe('grant and revoke', () => {
	it('awards a badge no rule would have awarded', () => {
		delight.grant('git-lord');

		expect(delight.me.earned.map((entry) => entry.id)).toContain('git-lord');
	});

	it('awards it once', () => {
		delight.grant('cook');
		delight.grant('cook');

		expect(delight.me.earned.filter((entry) => entry.id === 'cook')).toHaveLength(1);
	});

	it('takes one back', () => {
		delight.grant('cook');
		delight.revoke('cook');

		expect(delight.me.earned).toEqual([]);
	});

	it('takes the title off with the badge it pointed at', () => {
		// A title pointing at a badge that is gone would draw as nothing at all.
		delight.grant('cook');
		delight.equip(delight.me.id, 'cook');
		delight.revoke('cook');

		expect(delight.title(delight.me.id)).toBeNull();
	});

	it('refuses an id that is not a badge', () => {
		delight.grant('not-a-badge');

		expect(delight.me.earned).toEqual([]);
	});

	it('survives revoking something that was never held', () => {
		expect(() => delight.revoke('cook')).not.toThrow();
	});

	it('fills the whole catalogue', () => {
		delight.grantEvery();

		expect(delight.me.earned).toHaveLength(BADGES.length);
	});

	it('writes through to storage, so it survives a rebind', () => {
		delight.grant('git-lord');
		delight.bind(null);
		delight.bind('/repos/one');

		expect(delight.me.earned.map((entry) => entry.id)).toContain('git-lord');
	});
});

describe('seeded agents', () => {
	it('puts three agents on the standings table', () => {
		delight.seedAgents();

		expect(standings(delight.list).map((row) => row.id).sort()).toEqual([
			'claude',
			'codex',
			'gpt'
		]);
	});

	it('leaves the person at the keyboard out of it', () => {
		delight.seedAgents();

		expect(delight.me.stats.tasks).toBe(0);
	});

	it('produces rates the rules could actually have produced', () => {
		delight.seedAgents();
		const rows = standings(delight.list);

		for (const row of rows) {
			expect(row.approval, row.id).toBeGreaterThan(0);
			expect(row.approval, row.id).toBeLessThanOrEqual(100);
			expect(row.tasks, row.id).toBeGreaterThan(0);
		}
	});
});

describe('the demo catalogue', () => {
	it('names each demo once', () => {
		const ids = DEMOS.map((demo) => demo.id);
		expect(ids.length).toBe(new Set(ids).size);
	});

	it('earns something with every demo that does not say otherwise', () => {
		// A button that fires an event nothing reacts to is a button that makes
		// the engine look broken, so the only ones allowed to earn nothing are
		// the ones whose description says they are a step towards something.
		for (const demo of DEMOS.filter((entry) => !entry.partial)) {
			delight.clear();
			delight.bind(`/repos/${demo.id}`);

			// Surgical Strike needs a commit before it, which the demo says.
			if (demo.id === 'surgical') {
				for (const event of expand(DEMOS[0], Date.now())) delight.record(event);
			}

			const before = delight.me.earned.length;
			for (const event of expand(demo, Date.now())) delight.record(event);

			expect(delight.me.earned.length, `${demo.id} earned nothing`).toBeGreaterThan(before);
		}
	});

	it('steps the clock across a checkout burst', () => {
		// Six checkouts at the same instant is one checkout six times.
		const burst = DEMOS.find((demo) => demo.event.kind === 'checkout');
		expect(burst).toBeDefined();

		const events = expand(burst!, 1_000_000);
		const times = events.map((event) => (event.kind === 'checkout' ? event.at : 0));

		expect(new Set(times).size).toBe(events.length);
		expect(Math.max(...times) - Math.min(...times)).toBeLessThan(LIMITS.burstWindowMs);
	});
});
