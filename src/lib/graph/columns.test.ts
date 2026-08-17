// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The graph's columns, and in particular the one that fills.
 *
 * FEAT-025: the Commit Message column takes the leftover width, which is the
 * right default and used to mean it had no drag handle at all — the one column
 * a person could not size. It now fills *until dragged*, and a stored width is
 * what both gives it a size and stops it filling, so there is no second flag
 * that could disagree with the width.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { columns } from './columns.svelte';

beforeEach(() => {
	columns.reset();
});

function shownById(id: string) {
	const column = columns.shown.find((c) => c.id === id);
	if (!column) throw new Error(`${id} is not shown`);
	return column;
}

describe('the filling column', () => {
	it('fills by default, so the messages get what is left', () => {
		expect(shownById('message').fills).toBe(true);
		expect(columns.totalWidth).toBeNull();
	});

	it('stops filling once it is dragged, and keeps the width it was given', () => {
		columns.resize('message', 420);

		const message = shownById('message');
		expect(message.fills).toBeFalsy();
		expect(message.width).toBe(420);
	});

	it('cannot be dragged below what a message needs to say anything', () => {
		columns.resize('message', 20);
		expect(shownById('message').width).toBe(160);
	});

	it('fills again when its width is cleared', () => {
		columns.resize('message', 420);
		columns.unsize('message');

		expect(shownById('message').fills).toBe(true);
		expect(columns.totalWidth).toBeNull();
	});
});

describe('the total width', () => {
	it('is null while anything fills, because the table is exactly its viewport', () => {
		expect(columns.totalWidth).toBeNull();
	});

	it('adds up every column once none of them fills', () => {
		columns.resize('message', 400);

		const total = columns.shown.reduce((sum, column) => sum + column.width, 0);
		expect(columns.totalWidth).toBe(total);
		expect(columns.totalWidth).toBeGreaterThan(400);
	});

	it('grows when another column is added', () => {
		columns.resize('message', 400);
		const before = columns.totalWidth ?? 0;

		columns.toggle('author');

		expect(columns.totalWidth).toBeGreaterThan(before);
	});
});

describe('the graph column', () => {
	it('still refuses to be dragged, because its width is the lanes on screen', () => {
		const before = columns.width('graph');
		columns.resize('graph', 40);
		expect(columns.width('graph')).toBe(before);
	});
});

describe('resetting', () => {
	it('puts the order, the widths and the fill back', () => {
		columns.resize('refs', 120);
		columns.resize('message', 300);
		columns.toggle('sha');

		columns.reset();

		expect(columns.shown.map((c) => c.id)).toEqual(['refs', 'graph', 'message']);
		expect(shownById('refs').width).toBe(186);
		expect(shownById('message').fills).toBe(true);
	});
});
