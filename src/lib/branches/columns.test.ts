// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The branches table's columns (FEAT-047).
 *
 * The machinery is shared with the graph and tested there. What is asserted
 * here is what is specific to this table and what would be invisible until
 * somebody's layout landed on the wrong screen: its own storage prefix, the
 * branch name as the column that fills, and a layout that follows the
 * repository rather than the install.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { columns } from './columns.svelte';

const PREFIX = 'spagitty.branches.columns:';

beforeEach(() => {
	localStorage.clear();
	columns.reset();
	columns.open('/repos/one');
	columns.reset();
});

function shownById(id: string) {
	const column = columns.shown.find((candidate) => candidate.id === id);
	if (!column) throw new Error(`${id} is not shown`);
	return column;
}

describe('the shape of the table', () => {
	it('is the design’s four columns, in the design’s order', () => {
		expect(columns.shown.map((column) => column.id)).toEqual([
			'name',
			'drift',
			'when',
			'actions'
		]);
	});

	it('gives the leftover width to the branch name', () => {
		expect(shownById('name').fills).toBe(true);
		expect(columns.totalWidth).toBeNull();
	});

	it('gives the divergence bar more room than the arrows had', () => {
		// 90px was the cell the author called awful. The bar needs the space,
		// and 90 stays as the minimum rather than as the width.
		expect(shownById('drift').width).toBe(150);
		expect(shownById('drift').min).toBe(90);
	});
});

describe('persistence', () => {
	it('writes under its own prefix, so it cannot land on the graph', () => {
		columns.resize('when', 260);
		expect(localStorage.getItem(PREFIX + '/repos/one')).toContain('260');
		expect(localStorage.getItem('spagitty.graph.columns:/repos/one')).toBeNull();
	});

	it('remembers a width per repository', () => {
		columns.resize('when', 260);

		columns.open('/repos/two');
		expect(shownById('when').width).toBe(220);

		columns.open('/repos/one');
		expect(shownById('when').width).toBe(260);
	});

	it('keeps the layout on screen when no repository is open', () => {
		columns.resize('when', 260);
		columns.open(null);
		expect(shownById('when').width).toBe(260);
	});

	it('hands a dragged width back, which is what the double-click does', () => {
		columns.resize('name', 300);
		expect(shownById('name').fills).toBeFalsy();

		columns.unsize('name');
		expect(shownById('name').fills).toBe(true);
	});
});
