// SPDX-License-Identifier: GPL-3.0-or-later

import type { DiffLine } from '$lib/types';

/** One row of the split view: the before line, the after line, or both. */
export interface SplitRow {
	left: DiffLine | null;
	right: DiffLine | null;
}

/**
 * Lay a hunk's lines out in two columns.
 *
 * A run of removals and the run of additions that follows it are the same edit
 * seen from either side, so they are paired row by row; whichever run is longer
 * leaves blank cells opposite its tail. Context lines appear in both columns
 * and flush any pending run, which is what keeps the two sides aligned.
 */
export function splitRows(lines: DiffLine[]): SplitRow[] {
	const rows: SplitRow[] = [];
	let removed: DiffLine[] = [];
	let added: DiffLine[] = [];

	function flush() {
		const height = Math.max(removed.length, added.length);
		for (let i = 0; i < height; i += 1) {
			rows.push({ left: removed[i] ?? null, right: added[i] ?? null });
		}
		removed = [];
		added = [];
	}

	for (const line of lines) {
		if (line.origin === 'removed') {
			removed.push(line);
		} else if (line.origin === 'added') {
			added.push(line);
		} else {
			flush();
			rows.push({ left: line, right: line });
		}
	}
	flush();

	return rows;
}
