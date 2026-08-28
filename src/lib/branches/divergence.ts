// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The geometry behind the divergence bar (FEAT-047).
 *
 * `↑2 ↓3` in a 90px mono cell was the thing this replaces, and it read worst in
 * exactly the case that matters: a branch that is both ahead and behind. A bar
 * answers *how far, which way* before any number is read.
 *
 * The arithmetic is here rather than in the component so that the four states
 * can be asserted without mounting anything, and so that the counts on the bar
 * and the counts in the store cannot drift apart — there is one place that
 * turns a pair of counts into two widths.
 */

/** What a branch's divergence looks like on screen. */
export interface Divergence {
	/**
	 * `none` — no upstream, so there is nothing to be ahead or behind of and
	 * the bar is absent rather than drawn empty.
	 * `level` — an upstream, and no distance in either direction.
	 * `diverged` — at least one side has commits.
	 */
	state: 'none' | 'level' | 'diverged';
	/** Percentage of the half-width the behind segment fills, 0–100. */
	behind: number;
	/** Percentage of the half-width the ahead segment fills, 0–100. */
	ahead: number;
}

/** A branch as far as this file cares: two counts that may not exist. */
export interface Diverged {
	ahead: number | null;
	behind: number | null;
	upstream: string | null;
}

/**
 * The widest single-sided distance on screen.
 *
 * Both halves of every bar are scaled against this one number, so that two rows
 * can be compared by eye — a scale computed per row would make one commit and
 * two hundred draw the same. Zero when nothing has diverged, which keeps the
 * caller from dividing by it.
 */
export function widest(rows: Diverged[]): number {
	let max = 0;
	for (const row of rows) {
		max = Math.max(max, row.ahead ?? 0, row.behind ?? 0);
	}
	return max;
}

/**
 * A minimum visible sliver, in percent of the half-width.
 *
 * One commit against a maximum of four hundred is a quarter of a percent, which
 * paints as nothing at all and reads as `level`. The floor is what keeps "one
 * commit" and "no commits" different at a glance, which is the whole point of
 * the bar.
 */
const SLIVER = 12;

/** Turn a row's counts into the two segment widths the bar draws. */
export function divergence(row: Diverged, max: number): Divergence {
	if (row.upstream === null || row.ahead === null || row.behind === null) {
		return { state: 'none', behind: 0, ahead: 0 };
	}

	if (row.ahead === 0 && row.behind === 0) {
		return { state: 'level', behind: 0, ahead: 0 };
	}

	return {
		state: 'diverged',
		behind: segment(row.behind, max),
		ahead: segment(row.ahead, max)
	};
}

function segment(count: number, max: number): number {
	if (count === 0) return 0;
	if (max <= 0) return 100;
	return Math.max(SLIVER, Math.min(100, Math.round((count / max) * 100)));
}

/** The sentence the cell keeps carrying, so nothing here is glyph-only. */
export function divergenceTitle(row: Diverged): string {
	if (row.upstream === null) return 'No upstream configured';
	if (row.ahead === 0 && row.behind === 0) return `Level with ${row.upstream}`;
	return `${row.ahead} ahead of and ${row.behind} behind ${row.upstream}, as of the last fetch`;
}
