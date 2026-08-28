// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The branches table's columns.
 *
 * The machinery is `$lib/ui/columns.svelte`, extracted from the graph when this
 * screen needed the same thing (FEAT-047). What is here is what is about
 * branches: four columns, the branch name filling, and a storage prefix of its
 * own so a layout chosen here never lands on the graph.
 *
 * Hiding and reordering are deliberately not offered on this screen — the item
 * scoped resizing, and a four-column table where one is the branch name and one
 * is the actions has nothing worth hiding. The catalogue still marks every
 * column `required` so that a stored layout from a future version that dropped
 * one is repaired rather than rendered.
 */

import { createColumns, type Column } from '$lib/ui/columns.svelte';

export type ColumnId = 'name' | 'drift' | 'when' | 'actions';

export type { Column };

/**
 * Widths carried over from the grid this replaced, so nobody's table moves on
 * the first paint after the upgrade. The drift column is the exception: the bar
 * needs room the `↑2 ↓3` cell never had.
 */
const CATALOGUE: Column<ColumnId>[] = [
	{ id: 'name', label: 'branch', width: 0, min: 140, fills: true, required: true },
	{ id: 'drift', label: 'ahead / behind', width: 150, min: 90, required: true },
	{ id: 'when', label: 'last change', width: 220, min: 120, required: true },
	{ id: 'actions', label: 'actions', width: 210, min: 150, required: true }
];

const DEFAULT_ORDER: ColumnId[] = ['name', 'drift', 'when', 'actions'];

const store = createColumns<ColumnId>({
	catalogue: CATALOGUE,
	defaultOrder: DEFAULT_ORDER,
	storageKey: 'spagitty.branches.columns:'
});

export const columns = {
	/** The shown columns, in draw order, with their current widths. */
	get shown() {
		return store.shown;
	},

	/** Total width of the columns, or null while the branch name is filling. */
	get totalWidth() {
		return store.totalWidth;
	},

	width: (id: ColumnId) => store.width(id),
	resize: (id: ColumnId, next: number) => store.resize(id, next),
	unsize: (id: ColumnId) => store.unsize(id),
	reset: () => store.reset(),
	open: (path: string | null) => store.open(path)
};
