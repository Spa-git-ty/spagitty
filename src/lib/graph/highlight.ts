// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Hover answers: which commits belong to a branch, and where a commit's
 * nearest reference is.
 *
 * Both are questions about *the rows already loaded*, not about the repository,
 * and that is deliberate. A `git merge-base` or a second walk per hover would
 * be a round trip on mouse movement; the graph's rows already carry their
 * parents, so the shape is right there. The cost is that an answer stops at the
 * end of what has been walked — which is the honest answer anyway, because a
 * highlight cannot mean anything about rows that are not on screen to be
 * highlighted.
 *
 * Everything here is a pure function over a row accessor, so it is testable
 * without a repository and without a DOM.
 */

import type { GraphRow } from '../types';

/** How far a hover will search. Past this the answer is not worth the frame. */
const LIMIT = 20000;

export type RowAt = (index: number) => GraphRow | undefined;

/**
 * Every loaded row reachable from `tip`, following all parents.
 *
 * This is what hovering a branch highlights: its own commits, and everything in
 * its history — which is what "this branch" means to anyone reading a graph.
 * Merges pull in both sides, because both sides are in the branch.
 *
 * Ancestry only goes backwards, and rows are ordered newest-first, so the walk
 * only ever needs to look at rows *after* the tip. That turns what would be a
 * graph search into a single downward sweep with a set of wanted ids.
 */
export function ancestry(tipIndex: number, row: RowAt, count: number): Set<number> {
	const found = new Set<number>();

	const start = row(tipIndex);
	if (!start) return found;

	const wanted = new Set<string>([start.id]);
	const end = Math.min(count, tipIndex + LIMIT);

	for (let i = tipIndex; i < end; i++) {
		const current = row(i);
		if (!current) continue;
		if (!wanted.has(current.id)) continue;

		found.add(i);
		for (const parent of current.parents) wanted.add(parent);
	}

	return found;
}

/**
 * The rows between a commit and the nearest reference that contains it.
 *
 * The handoff calls it the ghost branch: hovering a commit with no label of its
 * own shows the line up to whatever *does* have one, so a bare commit still
 * says where it lives. The path is returned oldest-last — the commit itself
 * first, then each child, ending at the row carrying the reference.
 *
 * Breadth-first, so the *nearest* reference wins rather than whichever branch
 * happens to be first in the row's parent list. Returns an empty array when
 * nothing loaded descends from the commit, which is the case for a commit at
 * the tip of an unreferenced branch and is correctly nothing to draw.
 */
export function ghostPath(index: number, row: RowAt, count: number): number[] {
	const start = row(index);
	if (!start) return [];
	if (start.refs.length > 0) return [];

	// Children live at *lower* indices, so the map only needs the rows above.
	const childrenOf = new Map<string, number[]>();
	const from = Math.max(0, index - LIMIT);
	for (let i = from; i < index; i++) {
		const current = row(i);
		if (!current) continue;
		for (const parent of current.parents) {
			const list = childrenOf.get(parent);
			if (list) list.push(i);
			else childrenOf.set(parent, [i]);
		}
	}

	const cameFrom = new Map<number, number>();
	const queue: number[] = [index];
	const seen = new Set<number>([index]);

	while (queue.length > 0) {
		const at = queue.shift() as number;
		const current = row(at);
		if (!current) continue;

		if (at !== index && current.refs.length > 0) {
			// Walk the trail back to the commit, then reverse it.
			const path: number[] = [];
			for (let step: number | undefined = at; step !== undefined; step = cameFrom.get(step)) {
				path.push(step);
			}
			return path.reverse();
		}

		for (const child of childrenOf.get(current.id) ?? []) {
			if (seen.has(child)) continue;
			seen.add(child);
			cameFrom.set(child, at);
			queue.push(child);
		}
	}

	return [];
}

/**
 * The row a ref points at, by ref name, or null when it is not loaded.
 *
 * The graph knows a ref's commit only through the chips attached to rows, so a
 * branch whose tip has not been walked yet cannot be hovered — which is
 * correct, because there would be nothing on screen to hover.
 */
export function rowOfRef(name: string, row: RowAt, count: number): number | null {
	const end = Math.min(count, LIMIT);
	for (let i = 0; i < end; i++) {
		const current = row(i);
		if (!current) continue;
		if (current.refs.some((chip) => chip.name === name)) return i;
	}
	return null;
}

/** Rows whose author matches, for the Author column's filter. */
export function byAuthor(
	needle: string,
	row: RowAt,
	first: number,
	last: number
): Set<number> | null {
	const wanted = needle.trim().toLowerCase();
	if (wanted === '') return null;

	const found = new Set<number>();
	for (let i = first; i <= last; i++) {
		const current = row(i);
		if (!current) continue;
		if (current.authorName.toLowerCase().includes(wanted)) found.add(i);
	}
	return found;
}
