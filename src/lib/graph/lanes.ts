// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Lane drawing.
 *
 * One canvas covers the lane column for the *visible* window only. A repository
 * with 200k commits draws the same number of paths as one with 40 — whatever
 * fits on screen — so scrolling cost is flat.
 *
 * All geometry derives from `metrics.ts`. There is no pixel constant in this
 * file.
 */

import {
	ELBOW_C1,
	ELBOW_C2,
	LANE_STROKE,
	NODE_R,
	ROW_PITCH,
	laneX,
	rowCenterY
} from '../metrics';
import type { GraphRow } from '../types';

const TAU = Math.PI * 2;

export interface LaneDrawOptions {
	ctx: CanvasRenderingContext2D;
	width: number;
	height: number;
	scrollTop: number;
	/** Inclusive row range to draw. */
	first: number;
	last: number;
	row: (index: number) => GraphRow | undefined;
	/** Resolved lane colors, in cycle order. */
	colors: string[];
	/** Color for the initials inside a node. */
	nodeText: string;
	/** Lane columns the canvas is currently sized for. */
	columns: number;
}

export function drawLanes(options: LaneDrawOptions): void {
	const { ctx, width, height, scrollTop, first, last, row, colors, nodeText, columns } =
		options;

	ctx.clearRect(0, 0, width, height);
	ctx.lineWidth = LANE_STROKE;
	ctx.lineCap = 'round';

	// Edges first, so nodes sit on top of the lines that reach them.
	//
	// A row's edges describe the band *above* it, so the range runs one past
	// `last` — otherwise the segment arriving at the first row below the fold
	// would be missing and lanes would appear to stop short at the bottom edge.
	for (let i = first; i <= last + 1; i++) {
		const commit = row(i);
		if (!commit) continue;

		const bottom = rowCenterY(i) - scrollTop;
		const top = rowCenterY(i - 1) - scrollTop;

		for (const edge of commit.edges) {
			const x0 = laneX(edge.from, columns);
			const x1 = laneX(edge.to, columns);

			ctx.strokeStyle = colors[edge.color % colors.length];
			ctx.beginPath();
			ctx.moveTo(x0, top);
			if (x0 === x1) {
				ctx.lineTo(x1, bottom);
			} else {
				// A cubic elbow spanning exactly one row: it leaves vertically,
				// crosses, and arrives vertically, so it meets the straight run
				// above and below without a visible corner.
				ctx.bezierCurveTo(x0, top + ELBOW_C1, x1, bottom - ELBOW_C2, x1, bottom);
			}
			ctx.stroke();
		}
	}

	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.font = `7px ${getComputedStyle(ctx.canvas).getPropertyValue('--font-mono') || 'monospace'}`;

	for (let i = first; i <= last; i++) {
		const commit = row(i);
		if (!commit) continue;

		const x = laneX(commit.lane, columns);
		const y = rowCenterY(i) - scrollTop;
		if (y < -NODE_R || y > height + NODE_R) continue;

		ctx.fillStyle = colors[commit.color % colors.length];
		ctx.beginPath();
		ctx.arc(x, y, NODE_R, 0, TAU);
		ctx.fill();

		ctx.fillStyle = nodeText;
		ctx.fillText(commit.initials, x, y);
	}
}

/**
 * How many lane columns the rows in view actually need.
 *
 * Counts edges as well as nodes: a lane can pass straight through the whole
 * window without a single commit sitting in it, and it still has to be drawn.
 * The `last + 1` matches `drawLanes`, which reaches one row past the fold for
 * the band arriving there.
 */
export function lanesNeeded(
	first: number,
	last: number,
	row: (index: number) => GraphRow | undefined
): number {
	let deepest = 0;
	for (let i = first; i <= last + 1; i++) {
		const commit = row(i);
		if (!commit) continue;
		if (commit.lane > deepest) deepest = commit.lane;
		for (const edge of commit.edges) {
			if (edge.from > deepest) deepest = edge.from;
			if (edge.to > deepest) deepest = edge.to;
		}
	}
	return deepest + 1;
}

/**
 * Which rows are in view. Overscan keeps a row of slack above and below so a
 * fast scroll does not show a blank strip before the next frame.
 */
export function visibleRange(
	scrollTop: number,
	viewportHeight: number,
	count: number,
	overscan = 4
): { first: number; last: number } {
	if (count === 0) return { first: 0, last: -1 };
	const first = Math.max(0, Math.floor(scrollTop / ROW_PITCH) - overscan);
	const last = Math.min(count - 1, Math.ceil((scrollTop + viewportHeight) / ROW_PITCH) + overscan);
	return { first, last };
}
