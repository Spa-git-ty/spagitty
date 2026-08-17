// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';

import { byAuthor } from './highlight';
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
		authorEmail: `${(extra.author ?? 'ada').toLowerCase().replace(/\s+/g, '.')}@example.com`,
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
