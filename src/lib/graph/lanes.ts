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
	/** Row height in effect. `scale.pitch`, not the design constant. */
	pitch?: number;
	/** Interface zoom, which scales the horizontal geometry and the node. */
	zoom?: number;
	/**
	 * Rows to paint at full strength while everything else fades. Null means no
	 * highlight is running, which is not the same as an empty set — an empty set
	 * fades every row, and that is what hovering a branch with no visible
	 * commits would otherwise do.
	 */
	highlight?: Set<number> | null;
	/**
	 * Row indices from a hovered commit up to the nearest reference — the ghost
	 * branch. Drawn dashed, over everything, because it is an answer to a
	 * question just asked rather than part of the history's shape.
	 */
	ghost?: number[];
	/**
	 * Rows carrying a stash, and how many. A stash is a commit hanging off the
	 * row it was made on, so it is drawn beside that row's node rather than
	 * being given a row of its own — see `overlay.svelte.ts`.
	 */
	stashes?: Map<number, number>;
}

/** How much of its colour a row keeps when another branch is being hovered. */
const FADED = 0.22;

export function drawLanes(options: LaneDrawOptions): void {
	const {
		ctx,
		width,
		height,
		scrollTop,
		first,
		last,
		row,
		colors,
		nodeText,
		columns,
		pitch = ROW_PITCH,
		zoom = 1,
		highlight = null,
		ghost = [],
		stashes
	} = options;

	ctx.clearRect(0, 0, width, height);
	ctx.lineWidth = LANE_STROKE * zoom;
	ctx.lineCap = 'round';

	/** Full strength unless a highlight is running and this row is outside it. */
	const alphaFor = (index: number): number =>
		highlight === null || highlight.has(index) ? 1 : FADED;

	// Edges first, so nodes sit on top of the lines that reach them.
	//
	// A row's edges describe the band *above* it, so the range runs one past
	// `last` — otherwise the segment arriving at the first row below the fold
	// would be missing and lanes would appear to stop short at the bottom edge.
	// Elbow control points are fractions of the pitch, so they follow it.
	const c1 = (ELBOW_C1 / ROW_PITCH) * pitch;
	const c2 = (ELBOW_C2 / ROW_PITCH) * pitch;

	for (let i = first; i <= last + 1; i++) {
		const commit = row(i);
		if (!commit) continue;

		const bottom = rowCenterY(i, pitch) - scrollTop;
		const top = rowCenterY(i - 1, pitch) - scrollTop;
		// A band belongs to both rows it joins; it stays bright if either end is
		// in the highlight, so a branch's line is not cut off at its own tip.
		ctx.globalAlpha = Math.max(alphaFor(i), alphaFor(i - 1));

		for (const edge of commit.edges) {
			const x0 = laneX(edge.from, columns, zoom);
			const x1 = laneX(edge.to, columns, zoom);

			ctx.strokeStyle = colors[edge.color % colors.length];
			ctx.beginPath();
			ctx.moveTo(x0, top);
			if (x0 === x1) {
				ctx.lineTo(x1, bottom);
			} else {
				// A cubic elbow spanning exactly one row: it leaves vertically,
				// crosses, and arrives vertically, so it meets the straight run
				// above and below without a visible corner.
				ctx.bezierCurveTo(x0, top + c1, x1, bottom - c2, x1, bottom);
			}
			ctx.stroke();
		}
	}
	ctx.globalAlpha = 1;

	const radius = NODE_R * zoom;
	const mono = getComputedStyle(ctx.canvas).getPropertyValue('--font-mono') || 'monospace';

	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.font = `${Math.round(7 * zoom)}px ${mono}`;

	for (let i = first; i <= last; i++) {
		const commit = row(i);
		if (!commit) continue;

		const x = laneX(commit.lane, columns, zoom);
		const y = rowCenterY(i, pitch) - scrollTop;
		if (y < -radius || y > height + radius) continue;

		ctx.globalAlpha = alphaFor(i);
		ctx.fillStyle = colors[commit.color % colors.length];

		// A merge is a different kind of event and gets a different shape, so
		// the two are told apart at a glance rather than by counting the lines
		// arriving at them.
		if (commit.parents.length > 1) {
			roundedSquare(ctx, x, y, radius, radius * 0.45);
		} else {
			ctx.beginPath();
			ctx.arc(x, y, radius, 0, TAU);
		}
		ctx.fill();

		ctx.fillStyle = nodeText;
		ctx.fillText(commit.initials, x, y);

		// A stash sits to the right of the commit it was made on, joined by a
		// short stub: a diamond, so it is not mistaken for a commit at a glance.
		const count = stashes?.get(i) ?? 0;
		if (count > 0) {
			const at = x + radius * 2.1;
			ctx.strokeStyle = colors[commit.color % colors.length];
			ctx.lineWidth = LANE_STROKE * zoom;
			ctx.beginPath();
			ctx.moveTo(x + radius, y);
			ctx.lineTo(at - radius * 0.7, y);
			ctx.stroke();

			ctx.fillStyle = colors[commit.color % colors.length];
			diamond(ctx, at, y, radius * 0.75);
			ctx.fill();
		}
	}
	ctx.globalAlpha = 1;

	drawGhost(ctx, ghost, row, columns, pitch, zoom, scrollTop, colors);
}

/**
 * The ghost branch: a dashed line from a bare commit up to the nearest row that
 * carries a reference.
 *
 * Dashed and drawn last, over the lanes, because it is not part of the history
 * — it is the graph answering "where does this one live" for as long as the
 * pointer is on it.
 */
function drawGhost(
	ctx: CanvasRenderingContext2D,
	path: number[],
	row: (index: number) => GraphRow | undefined,
	columns: number,
	pitch: number,
	zoom: number,
	scrollTop: number,
	colors: string[]
): void {
	if (path.length < 2) return;

	ctx.save();
	ctx.setLineDash([3 * zoom, 3 * zoom]);
	ctx.lineWidth = LANE_STROKE * zoom;
	ctx.strokeStyle = colors[0];
	ctx.globalAlpha = 0.85;

	ctx.beginPath();
	let started = false;
	for (const index of path) {
		const commit = row(index);
		if (!commit) continue;
		const x = laneX(commit.lane, columns, zoom);
		const y = rowCenterY(index, pitch) - scrollTop;
		if (started) ctx.lineTo(x, y);
		else {
			ctx.moveTo(x, y);
			started = true;
		}
	}
	ctx.stroke();
	ctx.restore();
}

/** A diamond, centred, with `r` from centre to point. */
function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
	ctx.beginPath();
	ctx.moveTo(x, y - r);
	ctx.lineTo(x + r, y);
	ctx.lineTo(x, y + r);
	ctx.lineTo(x - r, y);
	ctx.closePath();
}

/**
 * A square with rounded corners, centred on `x, y` and sized so that it reads
 * as the same weight as a circle of radius `r` beside it.
 *
 * `roundRect` would be shorter, but it is not in every webview GitLord ships
 * against, and a merge node that silently stops being drawn is worse than four
 * arcs written out.
 */
function roundedSquare(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	corner: number
): void {
	// 0.88 keeps the square's area close to the circle's; at 1.0 it reads as
	// noticeably bigger, because a square of side 2r has more of it.
	const half = r * 0.88;
	const left = x - half;
	const right = x + half;
	const top = y - half;
	const bottom = y + half;

	ctx.beginPath();
	ctx.moveTo(left + corner, top);
	ctx.arcTo(right, top, right, bottom, corner);
	ctx.arcTo(right, bottom, left, bottom, corner);
	ctx.arcTo(left, bottom, left, top, corner);
	ctx.arcTo(left, top, right, top, corner);
	ctx.closePath();
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
	overscan = 4,
	pitch: number = ROW_PITCH
): { first: number; last: number } {
	if (count === 0) return { first: 0, last: -1 };
	const first = Math.max(0, Math.floor(scrollTop / pitch) - overscan);
	const last = Math.min(count - 1, Math.ceil((scrollTop + viewportHeight) / pitch) + overscan);
	return { first, last };
}
