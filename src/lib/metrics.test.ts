// SPDX-License-Identifier: GPL-3.0-or-later

import { describe, expect, it } from 'vitest';
import {
	applyMetrics,
	LANE_COLOR_COUNT,
	LANE_COLUMNS_MAX,
	LANE_COLUMNS_MIN,
	LANE_PITCH,
	LANE_X0,
	ROW_PITCH,
	laneColorVar,
	laneColumnWidth,
	laneColumns,
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
		// Lanes at 12…72, r=5.5, 18px of slack, rounded: 96px.
		expect(laneColumnWidth(LANE_COLUMNS_MIN)).toBe(96);
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
