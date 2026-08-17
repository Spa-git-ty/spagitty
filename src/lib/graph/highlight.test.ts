// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';

import { ancestry, byAuthor, ghostPath, rowOfRef } from './highlight';
import type { GraphRow, RefChip } from '../types';

/**
 * A row, with only the fields these functions look at spelled out.
 *
 * The graph's rows are wide and none of this code reads the geometry, so
 * writing them out in full would bury the one thing each test is about.
 */
function makeRow(
	index: number,
	id: string,
	parents: string[],
	extra: { author?: string; refs?: string[] } = {}
): GraphRow {
	const refs: RefChip[] = (extra.refs ?? []).map((name) => ({
		name,
		kind: 'branch',
		current: false
	}));

	return {
		index,
		id,
		short: id.slice(0, 7),
		summary: `commit ${id}`,
		authorName: extra.author ?? 'Ada Lovelace',
		initials: 'AL',
		time: 1_700_000_000 - index * 60,
		lane: 0,
		color: 0,
		parents,
		refs,
		edges: []
	};
}

/** Rows newest-first, the order the graph holds them in. */
function accessor(rows: GraphRow[]) {
	return (index: number) => rows[index];
}

/**
 * A history with a topic branch merged back:
 *
 *   0  m2   merge, parents m1 and t1     [main]
 *   1  t1   topic commit                 [topic]
 *   2  m1   main commit
 *   3  b0   the base both descend from
 *   4  root
 */
const MERGED: GraphRow[] = [
	makeRow(0, 'm2', ['m1', 't1'], { refs: ['main'] }),
	makeRow(1, 't1', ['b0'], { author: 'Grace Hopper', refs: ['topic'] }),
	makeRow(2, 'm1', ['b0']),
	makeRow(3, 'b0', ['root']),
	makeRow(4, 'root', [])
];

describe('ancestry', () => {
	it('includes the tip and everything it reaches', () => {
		expect(ancestry(0, accessor(MERGED), MERGED.length)).toEqual(new Set([0, 1, 2, 3, 4]));
	});

	it('follows both sides of a merge, because both sides are in the branch', () => {
		const found = ancestry(0, accessor(MERGED), MERGED.length);
		expect(found.has(1)).toBe(true);
		expect(found.has(2)).toBe(true);
	});

	it('excludes commits that are not ancestors', () => {
		// From the topic tip, the main-only commit is not reachable.
		expect(ancestry(1, accessor(MERGED), MERGED.length)).toEqual(new Set([1, 3, 4]));
	});

	it('never looks above the tip, since ancestry only goes backwards', () => {
		expect(ancestry(2, accessor(MERGED), MERGED.length)).toEqual(new Set([2, 3, 4]));
	});

	it('is empty for a row that has not been walked yet', () => {
		expect(ancestry(99, accessor(MERGED), MERGED.length).size).toBe(0);
	});

	it('stops at the end of what is loaded rather than inventing rows', () => {
		// Only the first two rows exist so far; `count` says so.
		expect(ancestry(0, accessor(MERGED), 2)).toEqual(new Set([0, 1]));
	});

	it('skips gaps left by a walk that has not filled every index', () => {
		const sparse = [MERGED[0], undefined as unknown as GraphRow, MERGED[2], MERGED[3], MERGED[4]];
		expect(ancestry(0, accessor(sparse), sparse.length)).toEqual(new Set([0, 2, 3, 4]));
	});
});

describe('ghostPath', () => {
	it('draws nothing from a commit that already carries a label', () => {
		expect(ghostPath(0, accessor(MERGED), MERGED.length)).toEqual([]);
		expect(ghostPath(1, accessor(MERGED), MERGED.length)).toEqual([]);
	});

	it('runs from a bare commit up to the nearest labelled row', () => {
		// Row 2 has no ref; its only child is the merge at row 0, which has one.
		expect(ghostPath(2, accessor(MERGED), MERGED.length)).toEqual([2, 0]);
	});

	it('takes the shortest route when a commit is reachable from two labels', () => {
		// b0 is the parent of both t1 (row 1, labelled) and m1 (row 2, bare).
		// Breadth-first must stop at the labelled child one step away.
		expect(ghostPath(3, accessor(MERGED), MERGED.length)).toEqual([3, 1]);
	});

	it('returns the trail in order, commit first and reference last', () => {
		// root -> b0 -> t1[topic]: two hops, so the middle row must appear.
		const path = ghostPath(4, accessor(MERGED), MERGED.length);
		expect(path[0]).toBe(4);
		expect(path[path.length - 1]).toBe(1);
		expect(path.length).toBe(3);
	});

	it('is empty when nothing loaded descends from the commit', () => {
		const orphan = [makeRow(0, 'only', [])];
		expect(ghostPath(0, accessor(orphan), 1)).toEqual([]);
	});

	it('is empty for a row that has not been walked yet', () => {
		expect(ghostPath(99, accessor(MERGED), MERGED.length)).toEqual([]);
	});

	it('is empty when every descendant is also unlabelled', () => {
		const bare = [makeRow(0, 'c1', ['c0']), makeRow(1, 'c0', [])];
		expect(ghostPath(1, accessor(bare), 2)).toEqual([]);
	});
});

describe('rowOfRef', () => {
	it('finds the row a branch points at', () => {
		expect(rowOfRef('topic', accessor(MERGED), MERGED.length)).toBe(1);
		expect(rowOfRef('main', accessor(MERGED), MERGED.length)).toBe(0);
	});

	it('is null for a ref whose tip has not been walked', () => {
		expect(rowOfRef('nowhere', accessor(MERGED), MERGED.length)).toBeNull();
	});

	it('matches the whole name, not a prefix of it', () => {
		expect(rowOfRef('top', accessor(MERGED), MERGED.length)).toBeNull();
	});

	it('does not look past what has been loaded', () => {
		expect(rowOfRef('topic', accessor(MERGED), 1)).toBeNull();
	});
});

describe('byAuthor', () => {
	const rows = accessor(MERGED);
	const last = MERGED.length - 1;

	it('dims nothing when there is no filter', () => {
		expect(byAuthor('', rows, 0, last)).toBeNull();
		expect(byAuthor('   ', rows, 0, last)).toBeNull();
	});

	it('matches on a substring, so a surname finds a full name', () => {
		expect(byAuthor('hopper', rows, 0, last)).toEqual(new Set([1]));
	});

	it('ignores case and surrounding space', () => {
		expect(byAuthor('  HOPPER ', rows, 0, last)).toEqual(new Set([1]));
	});

	it('returns an empty set — not null — when a real filter matches nothing', () => {
		// The distinction matters: null means "dim nothing", empty means
		// "nothing matched", and the two must not render the same.
		expect(byAuthor('nobody', rows, 0, last)).toEqual(new Set());
	});

	it('only considers the range it was given', () => {
		expect(byAuthor('hopper', rows, 2, last)).toEqual(new Set());
	});

	it('skips rows the walk has not delivered', () => {
		const sparse = [undefined as unknown as GraphRow, MERGED[1]];
		expect(byAuthor('hopper', accessor(sparse), 0, 1)).toEqual(new Set([1]));
	});
});
