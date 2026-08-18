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

import { readFileSync } from 'node:fs';
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

/**
 * BUG-009 — the message column could not be resized.
 *
 * The store always allowed it: `message` fills but is not `computed`, so
 * `resize` accepts it. What stopped it was the handle. Every divider sits at
 * `right: -3px`, straddling the boundary between two columns — but the last
 * column has nothing on its right except the window edge, so a third of its
 * grab area was off-screen and the rest sat against the frame. The message
 * column is last by default, so in practice it had no handle at all.
 *
 * These read the stylesheet rather than a rendered header, for the reason
 * `src/lib/ui/btn.test.ts` sets out: the test environment applies no CSS, so a
 * geometry assertion here would pass whatever the rules said.
 */
describe('BUG-009 — the last column has a grabbable handle', () => {
	const header = readFileSync('src/lib/graph/GraphHeader.svelte', 'utf8');

	function rule(selector: string): string {
		const found = new RegExp(
			`${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`
		).exec(header);
		if (!found) throw new Error(`no rule for ${selector}`);
		return found[1];
	}

	it('pulls the last divider fully inside the column', () => {
		expect(rule('.divider.last')).toMatch(/right:\s*0/);
	});

	it('leaves every other divider straddling its boundary', () => {
		expect(rule('.divider')).toMatch(/right:\s*-3px/);
	});

	it('marks the last column in the markup, or the rule can never apply', () => {
		expect(header).toMatch(/class:last=\{index === shown\.length - 1\}/);
	});

	/** The store's half was never the problem, and must stay that way. */
	it('still lets the store resize the filling column', () => {
		columns.reset();
		const before = columns.width('message');
		columns.resize('message', 420);

		expect(columns.width('message')).toBe(420);
		expect(columns.width('message')).not.toBe(before);
	});

	it('refuses only the computed column', () => {
		columns.reset();
		const graph = columns.width('graph');
		columns.resize('graph', 999);

		expect(columns.width('graph')).toBe(graph);
	});
});

/**
 * BUG-009b — the boundary people actually reach for.
 *
 * The commit message column sits between the graph column, whose divider is
 * fixed because its width is computed from the lanes, and the detail panel's own
 * splitter. Both of its boundaries belonged to something else, so in practice it
 * had no handle — which is what was reported, with the first diagnosis (the
 * window edge) turning out to be wrong.
 *
 * A computed column's divider now sizes the column *after* it, inverted, so the
 * dead handle on the graph|message boundary does the thing the gesture looks
 * like it should do.
 */
describe('BUG-009b — a computed divider sizes the column after it', () => {
	const header = readFileSync('src/lib/graph/GraphHeader.svelte', 'utf8');

	it('sends a computed column\'s divider to the next column', () => {
		expect(header).toMatch(/if \(!column\.computed\) return \{ id: column\.id, invert: false \}/);
		expect(header).toMatch(/return \{ id: next\.id, invert: true \}/);
	});

	it('inverts that drag, so the boundary follows the pointer', () => {
		expect(header).toMatch(/const delta = resizing\.invert \? -travelled : travelled/);
	});

	it('measures the next cell, not the one the handle sits on', () => {
		expect(header).toMatch(/nextElementSibling/);
	});

	/** With nothing resizable on either side there is genuinely nothing to do. */
	it('still marks a divider fixed when it has no target', () => {
		expect(header).toMatch(/class:fixed=\{target === null\}/);
	});

	it('names the column it will actually size in its title', () => {
		expect(header).toMatch(/Resize \$\{sized\}/);
	});
});
