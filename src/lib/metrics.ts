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

/**
 * Horizontal distance between two lanes.
 *
 * Retuned from 24 after comparing GitLord and GitKraken side by side on the
 * same repository: the identical history was spreading across roughly twice
 * the width, which pushes the message column — the part people actually read —
 * off the right of the window on any history more than a few branches deep.
 *
 * Fifteen is the tightest pitch that still leaves a clear gap between two
 * adjacent lane strokes and their nodes: `2 × NODE_R + LANE_STROKE` is 13, so
 * neighbouring nodes keep two pixels of background between them at 100%.
 * Going tighter makes two parallel long-lived branches read as one thick line.
 */
export const LANE_PITCH = 15;

/** x of lane 0. Lanes therefore sit at 12, 27, 42, 57, 72. */
export const LANE_X0 = 12;

/**
 * Radius of a commit node.
 *
 * Bound to `LANE_PITCH`: a node wider than half the pitch collides with its
 * neighbour, and one much smaller stops being a click target. Reduced from 8
 * alongside the pitch, since the two only look right together.
 */
export const NODE_R = 5.5;

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
 * Slack between the rightmost node and the message column.
 *
 * The design's 28px was slack at a 24px pitch; kept at the retuned 15px pitch
 * it would be nearly two whole lanes of empty column, which is the widest
 * single contributor to a graph that looks wider than its history. Eighteen
 * still keeps a node clear of the divider and of the first character of a
 * commit message.
 */
const LANE_TAIL = 18;

/** Clamp a lane count into the range the column can render. */
export function laneColumns(needed: number): number {
	return Math.min(Math.max(needed, LANE_COLUMNS_MIN), LANE_COLUMNS_MAX);
}

/**
 * Width of the lane column for a given number of lanes, at a given zoom.
 *
 * Rounded to whole pixels: the node radius is fractional, and a column whose
 * CSS width lands on a half pixel puts the canvas and the row cells on
 * different device-pixel boundaries, which shows up as a lane line that is one
 * pixel off the node it is drawn through.
 */
export function laneColumnWidth(needed: number, zoom = 1): number {
	return Math.round(
		(LANE_X0 + (laneColumns(needed) - 1) * LANE_PITCH + NODE_R + LANE_TAIL) * zoom
	);
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

/** The lookup and blame column on the Log search screen. */
export const SEARCH_SIDE_W = 280;

/** The detail panel on the Pull requests screen. */
export const REQUESTS_DETAIL_W = 300;

// --- Lane elbow shape -----------------------------------------------------

/**
 * A branch/merge transition is a cubic elbow spanning exactly one row. Control
 * points are expressed as fractions of ROW_PITCH so the curve keeps its shape
 * if the pitch is ever retuned.
 *
 * Shortened from 0.65/0.58 with the lane pitch. A control point that long made
 * every crossing occupy a full row, so a branch two lanes over drifted sideways
 * through three rows before it settled — the "wandering lanes" that made the
 * graph read as wider than it is. At 0.40/0.34 the curve leaves and arrives
 * vertically but reaches its new lane in the upper half of the row, which is
 * the short elbow GitKraken draws.
 */
export const ELBOW_C1 = ROW_PITCH * 0.4;
export const ELBOW_C2 = ROW_PITCH * 0.34;

// --- Derived --------------------------------------------------------------

/**
 * Center y of row `i` within the scrolled content.
 *
 * `pitch` is the row height actually in effect — `scale.pitch`, not the design
 * constant — so that zooming moves rows and lanes by the same arithmetic. It
 * defaults to the constant, which is what every test and every unzoomed frame
 * wants.
 */
export function rowCenterY(index: number, pitch: number = ROW_PITCH): number {
	return index * pitch + pitch / 2;
}

/**
 * Center x of a lane, clamped to the column count currently being drawn.
 *
 * `zoom` scales the horizontal geometry the same way `applyMetrics` scales the
 * CSS widths, so the canvas and the reserved column keep agreeing.
 */
export function laneX(lane: number, columns: number = LANE_COLUMNS_MIN, zoom = 1): number {
	return (LANE_X0 + Math.min(lane, laneColumns(columns) - 1) * LANE_PITCH) * zoom;
}

/** CSS variable name of a lane's color. Lane colors cycle. */
export function laneColorVar(colorIndex: number): string {
	return `--lane-${(colorIndex % LANE_COLOR_COUNT) + 1}`;
}

/**
 * Radii, in CSS pixels, keyed by their token name without the `--`.
 *
 * `r-pill` is deliberately absent: a pill is `999px` at every zoom, because a
 * radius larger than half the box is already clamped by the browser and scaling
 * it would be arithmetic with no effect on any pixel.
 */
const RADII: Record<string, number> = {
	'r-field': 6,
	'r-button': 14,
	'r-row': 6,
	'r-panel': 8
};

/**
 * Publish the metrics to CSS so stylesheets can size things without
 * hard-coding a number that would drift from the value above.
 *
 * `zoom` scales structure — widths, radii, lane geometry. `pitchScale` scales
 * the commit-row pitch alone, and is `zoom × textScale`, because the row is the
 * box the commit message sits in and has to grow when the message does. Both
 * default to 1, so a caller that does not care about scaling gets the design's
 * own numbers.
 */
export function applyMetrics(
	root: HTMLElement = document.documentElement,
	zoom = 1,
	pitchScale = zoom
): void {
	const px: Record<string, number> = {
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
		'repo-card-w': REPO_CARD_W,
		'search-side-w': SEARCH_SIDE_W,
		'requests-detail-w': REQUESTS_DETAIL_W,
		...RADII
	};
	for (const [name, value] of Object.entries(px)) {
		root.style.setProperty(`--${name}`, `${Math.round(value * zoom)}px`);
	}

	// The pitch is its own line because it takes the other factor, and it is
	// clamped to at least one pixel: a zero-height row would divide by zero in
	// the virtualization arithmetic.
	root.style.setProperty(
		'--row-pitch',
		`${Math.max(1, Math.round(ROW_PITCH * pitchScale))}px`
	);
}
