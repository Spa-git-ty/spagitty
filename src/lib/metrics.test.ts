// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import {
	applyMetrics,
	LANE_COLOR_COUNT,
	LANE_COLUMNS_MAX,
	LANE_COLUMNS_MIN,
	LANE_INDEX_MAX,
	LANE_PITCH,
	LANE_PITCH_MIN,
	LANE_SPAN,
	LANE_STROKE,
	LANE_X0,
	MERGE_R,
	NODE_R,
	ROW_PITCH,
	laneColorVar,
	laneColumnWidth,
	laneColumns,
	laneNodeRadius,
	lanePitch,
	laneX,
	rowCenterY
} from './metrics';

describe('laneColumns', () => {
	it('never renders fewer columns than the design specifies', () => {
		expect(laneColumns(0)).toBe(LANE_COLUMNS_MIN);
		expect(laneColumns(1)).toBe(LANE_COLUMNS_MIN);
	});

	it('passes through a count inside the range', () => {
		expect(laneColumns(7)).toBe(7);
	});

	it('caps at the measured knee rather than growing without bound', () => {
		expect(laneColumns(LANE_COLUMNS_MAX)).toBe(LANE_COLUMNS_MAX);
		// git/git reaches lane depths in the hundreds; those clamp.
		expect(laneColumns(190)).toBe(LANE_COLUMNS_MAX);
	});
});

describe('laneColumnWidth', () => {
	it('fits five lanes and their slack', () => {
		// Lanes at 16…120, r=11 for the portrait, 18px of slack:
		// 16 + 4×26 + 11 + 18 = 149px.
		//
		// It was 96 while a node was a 5.5px disc, then 129 at the first
		// portrait size. FEAT-029 enlarged the face again, and a face needs both
		// a wider pitch and a wider node — the width is the price of the graph
		// saying who, and the message column is still the wider of the two at
		// five lanes.
		expect(laneColumnWidth(LANE_COLUMNS_MIN)).toBe(149);
	});

	it('rounds to whole pixels, so the canvas and the cells share a boundary', () => {
		for (const lanes of [5, 6, 9, 12]) {
			for (const zoom of [1, 1.1, 1.35, 2]) {
				expect(Number.isInteger(laneColumnWidth(lanes, zoom))).toBe(true);
			}
		}
	});

	it('widens by one lane pitch per extra column', () => {
		expect(laneColumnWidth(6) - laneColumnWidth(5)).toBe(LANE_PITCH);
	});

	it('stops widening past the cap', () => {
		expect(laneColumnWidth(200)).toBe(laneColumnWidth(LANE_COLUMNS_MAX));
	});
});

describe('rowCenterY', () => {
	it('puts row 0 half a pitch down', () => {
		expect(rowCenterY(0)).toBe(ROW_PITCH / 2);
	});

	it('advances exactly one pitch per row, with no accumulated drift', () => {
		// The lane canvas relies on this: a row's y is computed from its index,
		// never accumulated, so row 100000 lines up as precisely as row 1.
		expect(rowCenterY(100_000) - rowCenterY(99_999)).toBe(ROW_PITCH);
		expect(rowCenterY(100_000)).toBe(100_000 * ROW_PITCH + ROW_PITCH / 2);
	});
});

describe('laneX', () => {
	it('places lane 0 at the design offset', () => {
		expect(laneX(0)).toBe(LANE_X0);
	});

	it('steps by the lane pitch', () => {
		expect(laneX(1)).toBe(LANE_X0 + LANE_PITCH);
		expect(laneX(4)).toBe(LANE_X0 + 4 * LANE_PITCH);
	});

	it('clamps a lane past the drawn columns to the last one', () => {
		// Deeper lanes keep their own colour but share the last column, which is
		// what stops the canvas drawing off its own right edge.
		expect(laneX(9, 5)).toBe(laneX(4, 5));
		expect(laneX(400, LANE_COLUMNS_MAX)).toBe(laneX(LANE_COLUMNS_MAX - 1, LANE_COLUMNS_MAX));
	});

	it('honours a wider column count when one is given', () => {
		expect(laneX(7, 10)).toBe(LANE_X0 + 7 * LANE_PITCH);
	});
});

/**
 * FEAT-035 — lanes past the cap compress instead of stacking.
 *
 * The behaviour replaced: `laneX` clamped the lane *index*, so lanes 13, 14 and
 * 15 were all drawn at exactly the twelfth lane's x. They did not overflow the
 * column — the canvas clips to its own width — they were folded onto each
 * other, and a node on lane 15 sat precisely where a node on lane 12 did.
 */
describe('lanePitch', () => {
	it('leaves the design pitch alone up to the cap', () => {
		for (let lanes = 1; lanes <= LANE_COLUMNS_MAX; lanes++) {
			expect(lanePitch(lanes)).toBe(LANE_PITCH);
		}
	});

	it('shares the span out once there are more lanes than columns', () => {
		expect(lanePitch(LANE_COLUMNS_MAX + 1)).toBeCloseTo(LANE_SPAN / LANE_COLUMNS_MAX, 10);
		expect(lanePitch(24)).toBeCloseTo(LANE_SPAN / 23, 10);
	});

	it('narrows monotonically as lanes are added', () => {
		let previous = lanePitch(LANE_COLUMNS_MAX);
		for (let lanes = LANE_COLUMNS_MAX + 1; lanes <= 60; lanes++) {
			const pitch = lanePitch(lanes);
			expect(pitch).toBeLessThanOrEqual(previous);
			previous = pitch;
		}
	});

	/** Below this two lanes merge into one stripe, so squeezing stops helping. */
	it('never squeezes below the floor, however deep the history', () => {
		expect(lanePitch(200)).toBe(LANE_PITCH_MIN);
		expect(lanePitch(382)).toBe(LANE_PITCH_MIN);
		expect(lanePitch(100_000)).toBe(LANE_PITCH_MIN);
	});

	it('keeps a lane wider than the line drawn in it', () => {
		expect(LANE_PITCH_MIN).toBeGreaterThan(LANE_STROKE);
	});
});

describe('laneX under compression', () => {
	it('gives every lane past the cap a distinct x, where it used to stack them', () => {
		const lanes = 20;
		const xs = Array.from({ length: lanes }, (_, lane) => laneX(lane, lanes));

		expect(new Set(xs).size).toBe(lanes);
		// Strictly increasing, so lane order still reads left to right.
		for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i - 1]);
	});

	/** The whole point: the column does not grow, so it cannot reach the messages. */
	it('keeps the last lane inside the span at any lane count', () => {
		for (const lanes of [13, 16, 24, 48, 187, 382]) {
			expect(laneX(lanes - 1, lanes)).toBeLessThanOrEqual(LANE_X0 + LANE_SPAN);
		}
	});

	it('lands the last lane exactly on the span while the pitch still gives', () => {
		for (const lanes of [13, 20, 32, LANE_INDEX_MAX + 1]) {
			expect(laneX(lanes - 1, lanes)).toBeCloseTo(LANE_X0 + LANE_SPAN, 6);
		}
	});

	it('draws the same picture as before at or under the cap', () => {
		for (const columns of [LANE_COLUMNS_MIN, 8, LANE_COLUMNS_MAX]) {
			for (let lane = 0; lane < columns; lane++) {
				expect(laneX(lane, columns)).toBe(LANE_X0 + lane * LANE_PITCH);
			}
		}
	});

	/**
	 * Some histories defeat any width. `git/git` peaks at 382 lanes; once the
	 * pitch is at its floor the deepest still share a column — the old behaviour,
	 * now reached at 48 lanes rather than 12.
	 */
	it('stacks only once the pitch has nowhere left to go', () => {
		expect(laneX(LANE_INDEX_MAX + 5, 382)).toBe(laneX(LANE_INDEX_MAX, 382));
		expect(LANE_INDEX_MAX + 1).toBeGreaterThan(LANE_COLUMNS_MAX);
	});

	it('scales with zoom the way the reserved column does', () => {
		expect(laneX(6, 20, 2)).toBeCloseTo(laneX(6, 20) * 2, 10);
	});

	it('never returns a negative x for a nonsense lane', () => {
		expect(laneX(-3, 20)).toBe(LANE_X0);
	});
});

describe('laneNodeRadius', () => {
	it('leaves the node alone until the lanes actually tighten', () => {
		for (let lanes = 1; lanes <= LANE_COLUMNS_MAX; lanes++) {
			expect(laneNodeRadius(lanes)).toBe(NODE_R);
		}
	});

	/**
	 * The node is what set `LANE_PITCH` — "a lane closer than a node is wide
	 * draws lines through faces" — so a compressed pitch has to bring it down or
	 * the portraits paint over the room compression just made.
	 */
	it('never lets a node cover its neighbour’s lane, up to where the floor bites', () => {
		for (let lanes = LANE_COLUMNS_MAX + 1; lanes <= 32; lanes++) {
			expect(
				laneNodeRadius(lanes) * 2,
				`a node overlaps its neighbour at ${lanes} lanes`
			).toBeLessThanOrEqual(lanePitch(lanes));
		}
	});

	/**
	 * Past 32 lanes the `MERGE_R` floor is wider than the pitch, so nodes do
	 * begin to overlap. That is the deliberate end of the guarantee, not a
	 * defect: a node that kept shrinking would stop being visible, and by that
	 * depth it is the only thing locating a commit. Asserted so the trade is
	 * recorded rather than rediscovered.
	 */
	it('overlaps only below the floor, and only by the floor’s own width', () => {
		expect(laneNodeRadius(33) * 2).toBeGreaterThan(lanePitch(33));
		expect(laneNodeRadius(382)).toBe(MERGE_R);
	});

	it('shrinks as the lanes do, without stepping back up', () => {
		let previous = laneNodeRadius(LANE_COLUMNS_MAX);
		for (let lanes = LANE_COLUMNS_MAX + 1; lanes <= 60; lanes++) {
			const radius = laneNodeRadius(lanes);
			expect(radius).toBeLessThanOrEqual(previous);
			previous = radius;
		}
	});

	/** A node too small to see would be worse than one that overlaps a little. */
	it('never shrinks past the graph’s smallest meaningful mark', () => {
		expect(laneNodeRadius(382)).toBe(MERGE_R);
		expect(laneNodeRadius(100_000)).toBe(MERGE_R);
	});

	/**
	 * The radius picks the portrait tile size, and the tile cache is keyed on it.
	 * A radius that moved continuously with the lane count would mint a fresh
	 * tile for every author on every scroll that changed the depth by one.
	 */
	it('takes only a handful of distinct values, so the portrait cache holds', () => {
		const sizes = new Set<number>();
		for (let lanes = 1; lanes <= 400; lanes++) sizes.add(laneNodeRadius(lanes));

		expect(sizes.size).toBeLessThanOrEqual(12);
		// Every one but the floor is a whole pixel; MERGE_R is 4.5 by design.
		for (const size of sizes) {
			expect(Number.isInteger(size) || size === MERGE_R).toBe(true);
		}
	});
});

/**
 * BUG-003's territory. The lane canvas is sized from `laneColumnWidth` and the
 * lanes are drawn at `laneX`; if a lane can land outside the width the canvas
 * was given, the graph leaves its column — which is the defect BUG-003 was.
 * Compression changes lane geometry, so this is asserted rather than assumed.
 */
describe('the canvas is always wide enough for the lanes it draws', () => {
	it('holds for every lane count from one to a git/git-sized history', () => {
		for (const lanes of [1, 5, 8, 12, 13, 16, 24, 48, 49, 100, 187, 382]) {
			const width = laneColumnWidth(lanes);
			const deepest = laneX(lanes - 1, lanes) + laneNodeRadius(lanes);

			expect(deepest, `${lanes} lanes overflow a ${width}px canvas`).toBeLessThanOrEqual(width);
		}
	});

	it('holds at every zoom the scale dial offers', () => {
		for (const zoom of [1, 1.3, 1.7, 2]) {
			for (const lanes of [5, 12, 20, 48, 382]) {
				const width = laneColumnWidth(lanes, zoom);
				const deepest = laneX(lanes - 1, lanes, zoom) + laneNodeRadius(lanes) * zoom;

				expect(deepest).toBeLessThanOrEqual(width);
			}
		}
	});

	/** The column's width must not depend on how busy the history is past the cap. */
	it('reserves one width for every history past the cap', () => {
		const atCap = laneColumnWidth(LANE_COLUMNS_MAX);
		for (const lanes of [13, 24, 48, 187, 382]) {
			expect(laneColumnWidth(lanes)).toBe(atCap);
		}
	});
});

describe('laneColorVar', () => {
	it('is 1-based, because the CSS variables are', () => {
		expect(laneColorVar(0)).toBe('--lane-1');
	});

	it('cycles', () => {
		expect(laneColorVar(LANE_COLOR_COUNT)).toBe(laneColorVar(0));
		expect(laneColorVar(LANE_COLOR_COUNT * 3 + 2)).toBe(laneColorVar(2));
	});
});

describe('applyMetrics', () => {
	it('publishes every structural metric as a px custom property', () => {
		const set = new Map<string, string>();
		const root = { style: { setProperty: (k: string, v: string) => set.set(k, v) } };

		applyMetrics(root as unknown as HTMLElement);

		expect(set.get('--row-pitch')).toBe(`${ROW_PITCH}px`);
		expect(set.get('--lane-pitch')).toBe(`${LANE_PITCH}px`);
		expect(set.get('--lane-col-w')).toBe(`${laneColumnWidth(LANE_COLUMNS_MIN)}px`);
		// Every published value carries a unit; a bare number would be ignored
		// by CSS and the layout would silently fall back to zero.
		for (const value of set.values()) {
			expect(value).toMatch(/^\d+px$/);
		}
	});
});
