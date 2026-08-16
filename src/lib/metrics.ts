// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Structural metrics — the single source of truth.
 *
 * Everything that depends on the commit-row pitch reads ROW_PITCH from here:
 * the virtualized row list, the refs gutter, the lane canvas geometry, and the
 * stylesheet (via `applyMetrics`). There is no second `26` anywhere in the
 * frontend, and no `height: 26px` in any component.
 *
 * The Rust side mirrors ROW_PITCH in `crates/gitlord-core/src/graph.rs` because
 * lane elbows are described in row units there; that mirror is asserted against
 * this value at startup by `metrics_match`.
 */

/** Height of one commit row, in CSS pixels. The graph's fundamental unit. */
export const ROW_PITCH = 26;

/** Horizontal distance between two lanes. */
export const LANE_PITCH = 24;

/** x of lane 0. Lanes therefore sit at 18, 42, 66, 90, 114. */
export const LANE_X0 = 18;

/** Radius of a commit node. */
export const NODE_R = 8;

/** Stroke width of a lane line. */
export const LANE_STROKE = 2;

/**
 * Lane columns the design specifies, and the width the column is sized for by
 * default. Ordinary repositories never exceed this.
 */
export const LANE_COLUMNS_MIN = 5;

/**
 * Hard cap on lane columns.
 *
 * Real histories go well past the design's five. Measured on `cli/cli` (12,896
 * commits, 3,189 merges — an ordinary PR-merge workflow), by how many 40-row
 * viewports draw every lane they contain without clamping:
 *
 *     cap   lane col   message col @1280   viewports fully drawn
 *      5      150px          488px                  1.6%
 *      8      222px          416px                 15.8%
 *     10      270px          368px                 37.3%
 *     12      318px          320px                 61.8%   <- chosen
 *     14      366px          272px                 76.7%
 *     16      414px          224px                 87.3%
 *     20      510px          128px                 94.4%
 *
 * Twelve is the knee: it buys most of the improvement while leaving the message
 * column wider than the lane column. Past it the graph starts winning an
 * argument it should lose — the messages are what people read.
 *
 * Some histories defeat any cap. `git/git` needs a mean lane depth of 187 and
 * peaks at 382, because hundreds of topic branches interleave in date order;
 * git's own graph reaches 190 columns there. Those clamp to the last column,
 * keeping their own colour so they stay tellable apart.
 */
export const LANE_COLUMNS_MAX = 12;

/**
 * Slack between the rightmost node and the message column. Taken from the
 * design: a 150px column with lanes at 18…114 and r=8 leaves 28px.
 */
const LANE_TAIL = 28;

/** Clamp a lane count into the range the column can render. */
export function laneColumns(needed: number): number {
	return Math.min(Math.max(needed, LANE_COLUMNS_MIN), LANE_COLUMNS_MAX);
}

/** Width of the lane column for a given number of lanes. */
export function laneColumnWidth(needed: number): number {
	return LANE_X0 + (laneColumns(needed) - 1) * LANE_PITCH + NODE_R + LANE_TAIL;
}

/** Number of lane colors in the cycle; a lane keeps its color for its lifetime. */
export const LANE_COLOR_COUNT = 5;

// --- Chrome ---------------------------------------------------------------

export const TITLEBAR_H = 30;
export const TOOLBAR_H = 50;
export const RAIL_W = 186;
export const DETAIL_W = 270;

// --- Graph screen columns -------------------------------------------------

export const REFS_GUTTER_W = 186;

/** The design's lane column width: what five lanes need. */
export const LANE_COL_W = laneColumnWidth(LANE_COLUMNS_MIN);

// --- Diff screen columns --------------------------------------------------

/** The file list beside a commit's diff. */
export const DIFF_FILES_W = 210;

/**
 * Width of a line-number gutter, sized for five digits. Files longer than
 * 99,999 lines push the column wider rather than truncating the number.
 */
export const DIFF_GUTTER_W = 44;

// --- Working copy columns -------------------------------------------------

/** The staged/unstaged column on the Commit screen. */
export const CHANGES_FILES_W = 250;

/** A card on the All repositories screen. The design's 300px grid cell. */
export const REPO_CARD_W = 300;

// --- Lane elbow shape -----------------------------------------------------

/**
 * A branch/merge transition is a cubic elbow spanning exactly one row. Control
 * points are expressed as fractions of ROW_PITCH so the curve keeps its shape
 * if the pitch is ever retuned.
 */
export const ELBOW_C1 = ROW_PITCH * 0.65;
export const ELBOW_C2 = ROW_PITCH * 0.58;

// --- Derived --------------------------------------------------------------

/** Center y of row `i` within the scrolled content. */
export function rowCenterY(index: number): number {
	return index * ROW_PITCH + ROW_PITCH / 2;
}

/** Center x of a lane, clamped to the column count currently being drawn. */
export function laneX(lane: number, columns: number = LANE_COLUMNS_MIN): number {
	return LANE_X0 + Math.min(lane, laneColumns(columns) - 1) * LANE_PITCH;
}

/** CSS variable name of a lane's color. Lane colors cycle. */
export function laneColorVar(colorIndex: number): string {
	return `--lane-${(colorIndex % LANE_COLOR_COUNT) + 1}`;
}

/**
 * Publish the metrics to CSS so stylesheets can size things without
 * hard-coding a number that would drift from the value above.
 */
export function applyMetrics(root: HTMLElement = document.documentElement): void {
	const px: Record<string, number> = {
		'row-pitch': ROW_PITCH,
		'lane-pitch': LANE_PITCH,
		'titlebar-h': TITLEBAR_H,
		'toolbar-h': TOOLBAR_H,
		'rail-w': RAIL_W,
		'detail-w': DETAIL_W,
		'refs-gutter-w': REFS_GUTTER_W,
		'lane-col-w': LANE_COL_W,
		'diff-files-w': DIFF_FILES_W,
		'diff-gutter-w': DIFF_GUTTER_W,
		'changes-files-w': CHANGES_FILES_W,
		'repo-card-w': REPO_CARD_W
	};
	for (const [name, value] of Object.entries(px)) {
		root.style.setProperty(`--${name}`, `${value}px`);
	}
}
