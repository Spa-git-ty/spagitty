// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The divergence bar's arithmetic.
 *
 * What can be wrong here is scale: a segment that reads as nothing when there
 * is something, a segment that reads as everything when it is one commit out of
 * four hundred, and a scale computed per row rather than across the screen,
 * which would make one commit and two hundred draw identically. None of those
 * throws — they just draw a bar that lies — so they are asserted.
 */

import { describe, expect, it } from 'vitest';
import { divergence, divergenceTitle, widest, type Diverged } from './divergence';

function row(overrides: Partial<Diverged> = {}): Diverged {
	return { upstream: 'origin/main', ahead: 0, behind: 0, ...overrides };
}

describe('the widest divergence on screen', () => {
	it('is the largest single side, in either direction', () => {
		expect(
			widest([row({ ahead: 3, behind: 1 }), row({ ahead: 0, behind: 9 }), row({ ahead: 4 })])
		).toBe(9);
	});

	it('is zero when nothing has an upstream, so nothing divides by it', () => {
		expect(widest([row({ upstream: null, ahead: null, behind: null })])).toBe(0);
		expect(widest([])).toBe(0);
	});
});

describe('the four states', () => {
	it('has no bar without an upstream', () => {
		const shape = divergence(row({ upstream: null, ahead: null, behind: null }), 10);
		expect(shape).toEqual({ state: 'none', behind: 0, ahead: 0 });
	});

	it('is level with an upstream and no distance', () => {
		expect(divergence(row(), 10)).toEqual({ state: 'level', behind: 0, ahead: 0 });
	});

	it('fills one side only when the drift is one-sided', () => {
		expect(divergence(row({ ahead: 10, behind: 0 }), 10)).toEqual({
			state: 'diverged',
			behind: 0,
			ahead: 100
		});
		expect(divergence(row({ ahead: 0, behind: 10 }), 10)).toEqual({
			state: 'diverged',
			behind: 100,
			ahead: 0
		});
	});

	it('fills both sides independently when the branch is both', () => {
		expect(divergence(row({ ahead: 5, behind: 10 }), 10)).toEqual({
			state: 'diverged',
			behind: 100,
			ahead: 50
		});
	});
});

describe('the scale', () => {
	it('is the same across rows, so two rows can be compared by eye', () => {
		const rows = [row({ ahead: 2 }), row({ ahead: 8 })];
		const max = widest(rows);
		expect(divergence(rows[0], max).ahead).toBe(25);
		expect(divergence(rows[1], max).ahead).toBe(100);
	});

	it('never paints a real commit as nothing', () => {
		// A quarter of a percent would round to a bar of no width, which reads
		// as level. The floor is what keeps one commit visible.
		expect(divergence(row({ ahead: 1 }), 400).ahead).toBe(12);
	});

	it('never paints nothing as a commit', () => {
		expect(divergence(row({ ahead: 5, behind: 0 }), 400).behind).toBe(0);
	});

	it('fills the half when there is nothing to scale against', () => {
		// `widest` cannot return 0 while a row has counts, but a caller that
		// passes a stale maximum should still get a bar rather than a division
		// by zero.
		expect(divergence(row({ ahead: 3 }), 0).ahead).toBe(100);
	});
});

describe('the sentence the cell keeps carrying', () => {
	it('says so when there is no upstream', () => {
		expect(divergenceTitle(row({ upstream: null, ahead: null, behind: null }))).toBe(
			'No upstream configured'
		);
	});

	it('names the upstream when the branch is level with it', () => {
		expect(divergenceTitle(row())).toBe('Level with origin/main');
	});

	it('gives both counts and says how fresh they are', () => {
		expect(divergenceTitle(row({ ahead: 2, behind: 3 }))).toBe(
			'2 ahead of and 3 behind origin/main, as of the last fetch'
		);
	});
});
