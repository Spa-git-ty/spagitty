// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it, vi } from 'vitest';
import { drawLanes, lanesNeeded, visibleRange } from './lanes';
import { LANE_COLUMNS_MIN, NODE_R, ROW_PITCH, laneX, rowCenterY } from '../metrics';
import type { GraphRow, LaneEdge } from '../types';

function row(index: number, lane = 0, edges: LaneEdge[] = []): GraphRow {
	return {
		index,
		id: `${index}`.padStart(40, '0'),
		short: `${index}`.padStart(7, '0'),
		summary: `commit ${index}`,
		authorName: 'Ada Lovelace',
		initials: 'AL',
		time: 1_700_000_000 - index * 60,
		lane,
		color: lane,
		parents: [],
		refs: [],
		edges
	};
}

/** Look rows up out of an array, returning undefined past either end. */
function lookup(rows: GraphRow[]) {
	return (index: number) => rows[index];
}

describe('visibleRange', () => {
	it('reports an empty range for an empty list', () => {
		// `last` below `first` is what makes the caller's `for` loop skip.
		expect(visibleRange(0, 800, 0)).toEqual({ first: 0, last: -1 });
	});

	it('never starts above the first row', () => {
		expect(visibleRange(0, 800, 1000, 4).first).toBe(0);
	});

	it('never runs past the last row', () => {
		expect(visibleRange(0, 800, 10, 4).last).toBe(9);
	});

	it('covers the viewport plus overscan on both sides', () => {
		const { first, last } = visibleRange(100 * ROW_PITCH, 10 * ROW_PITCH, 1000, 4);
		expect(first).toBe(96);
		// 100 + 10 rows of viewport + 4 of overscan.
		expect(last).toBe(114);
	});

	it('covers every row the viewport actually shows', () => {
		const viewport = 7 * ROW_PITCH + 3; // deliberately not a whole number of rows
		const scrollTop = 40;
		const { first, last } = visibleRange(scrollTop, viewport, 1000, 0);

		// Every pixel of the viewport belongs to a row inside [first, last].
		const topRow = Math.floor(scrollTop / ROW_PITCH);
		const bottomRow = Math.floor((scrollTop + viewport - 1) / ROW_PITCH);
		expect(first).toBeLessThanOrEqual(topRow);
		expect(last).toBeGreaterThanOrEqual(bottomRow);
	});

	it('honours a zero overscan', () => {
		const { first } = visibleRange(10 * ROW_PITCH, 100, 1000, 0);
		expect(first).toBe(10);
	});
});

describe('lanesNeeded', () => {
	it('needs one column for a single lane-0 row', () => {
		expect(lanesNeeded(0, 0, lookup([row(0)]))).toBe(1);
	});

	it('counts the deepest node lane', () => {
		const rows = [row(0, 0), row(1, 3)];
		expect(lanesNeeded(0, 1, lookup(rows))).toBe(4);
	});

	it('counts lanes that only ever appear as edges', () => {
		// A lane can pass straight through the window without a commit sitting
		// in it. Counting nodes alone would clip it out of the canvas.
		const rows = [row(0, 0), row(1, 0, [{ from: 6, to: 6, color: 1 }])];
		expect(lanesNeeded(0, 1, lookup(rows))).toBe(7);
	});

	it('reaches one row past the fold, matching drawLanes', () => {
		const rows = [row(0, 0), row(1, 0), row(2, 0, [{ from: 5, to: 0, color: 2 }])];
		// Asking for rows 0..1 still has to account for the band arriving at 2.
		expect(lanesNeeded(0, 1, lookup(rows))).toBe(6);
	});

	it('ignores indices with no row', () => {
		expect(lanesNeeded(0, 50, lookup([row(0)]))).toBe(1);
	});
});

/** Minimal 2D context that records the calls the drawing code makes. */
function fakeContext() {
	const calls: Array<{ op: string; args: number[] }> = [];
	const record =
		(op: string) =>
		(...args: number[]) =>
			void calls.push({ op, args });

	const ctx = {
		canvas: {},
		clearRect: record('clearRect'),
		beginPath: record('beginPath'),
		moveTo: record('moveTo'),
		lineTo: record('lineTo'),
		bezierCurveTo: record('bezierCurveTo'),
		arc: record('arc'),
		fill: record('fill'),
		stroke: record('stroke'),
		fillText: vi.fn(),
		lineWidth: 0,
		lineCap: '',
		strokeStyle: '',
		fillStyle: '',
		font: '',
		textAlign: '',
		textBaseline: ''
	};
	return { ctx, calls };
}

function draw(rows: GraphRow[], first: number, last: number) {
	const { ctx, calls } = fakeContext();
	drawLanes({
		ctx: ctx as unknown as CanvasRenderingContext2D,
		width: 150,
		height: 400,
		scrollTop: 0,
		first,
		last,
		row: lookup(rows),
		colors: ['red', 'green', 'blue', 'orange', 'purple'],
		nodeText: 'white',
		columns: LANE_COLUMNS_MIN
	});
	return { ctx, calls };
}

describe('drawLanes', () => {
	// `getComputedStyle` is read for the node font. In node there is no DOM, so
	// the three tests below supply the one property the code asks for.
	const style = { getPropertyValue: () => 'monospace' };
	vi.stubGlobal('getComputedStyle', () => style);

	it('clears the canvas before drawing', () => {
		const { calls } = draw([row(0)], 0, 0);
		expect(calls[0].op).toBe('clearRect');
	});

	it('draws a straight segment for a lane that does not move', () => {
		const rows = [row(0), row(1, 0, [{ from: 0, to: 0, color: 0 }])];
		const { calls } = draw(rows, 0, 1);

		const line = calls.find((c) => c.op === 'lineTo');
		expect(line).toBeDefined();
		expect(calls.some((c) => c.op === 'bezierCurveTo')).toBe(false);
		expect(line?.args).toEqual([laneX(0), rowCenterY(1)]);
	});

	it('draws a cubic elbow for a lane that changes column', () => {
		const rows = [row(0), row(1, 0, [{ from: 0, to: 1, color: 1 }])];
		const { calls } = draw(rows, 0, 1);

		const curve = calls.find((c) => c.op === 'bezierCurveTo');
		expect(curve).toBeDefined();
		// It arrives vertically in the destination lane, at that row's centre.
		expect(curve?.args.slice(-2)).toEqual([laneX(1), rowCenterY(1)]);
	});

	it('draws the band arriving at the first row below the fold', () => {
		// Otherwise lanes appear to stop short at the bottom edge of the window.
		const rows = [row(0), row(1, 0, [{ from: 0, to: 0, color: 0 }])];
		const { calls } = draw(rows, 0, 0);
		expect(calls.some((c) => c.op === 'lineTo')).toBe(true);
	});

	it('draws nodes on top of the edges that reach them', () => {
		const rows = [row(0), row(1, 0, [{ from: 0, to: 0, color: 0 }])];
		const { calls } = draw(rows, 0, 1);
		const lastStroke = calls.map((c) => c.op).lastIndexOf('stroke');
		const firstArc = calls.map((c) => c.op).indexOf('arc');
		expect(firstArc).toBeGreaterThan(lastStroke);
	});

	it('draws one node per visible row, at its lane and row centre', () => {
		const rows = [row(0, 0), row(1, 2), row(2, 1)];
		const { calls } = draw(rows, 0, 2);
		const arcs = calls.filter((c) => c.op === 'arc');
		expect(arcs).toHaveLength(3);
		expect(arcs[1].args.slice(0, 3)).toEqual([laneX(2), rowCenterY(1), NODE_R]);
	});

	it('skips a node scrolled out of the canvas', () => {
		const rows = Array.from({ length: 200 }, (_, i) => row(i));
		const { ctx, calls } = fakeContext();
		drawLanes({
			ctx: ctx as unknown as CanvasRenderingContext2D,
			width: 150,
			height: 100,
			// Rows 0..3 are above the canvas at this scroll position.
			scrollTop: 100 * ROW_PITCH,
			first: 0,
			last: 199,
			row: lookup(rows),
			colors: ['red'],
			nodeText: 'white',
			columns: LANE_COLUMNS_MIN
		});
		const arcs = calls.filter((c) => c.op === 'arc');
		expect(arcs.length).toBeLessThan(rows.length);
		for (const arc of arcs) {
			expect(arc.args[1]).toBeGreaterThanOrEqual(-NODE_R);
			expect(arc.args[1]).toBeLessThanOrEqual(100 + NODE_R);
		}
	});

	it('cycles colours rather than running off the end of the list', () => {
		const rows = [row(0), { ...row(1, 0, [{ from: 0, to: 0, color: 12 }]), color: 12 }];
		expect(() => draw(rows, 0, 1)).not.toThrow();
	});
});
