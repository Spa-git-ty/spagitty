// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Resizable panel widths.
 *
 * The handoff's 186px rail and 270px detail panel are the *defaults*, not
 * fixed values — people work at different window sizes and care about different
 * columns. Widths are clamped so a panel can never be dragged to uselessness,
 * and they persist across restarts.
 *
 * These are published as the same CSS custom properties `applyMetrics` sets, so
 * every component keeps reading `var(--rail-w)` and needs no knowledge of the
 * drag.
 */

import { DETAIL_W, RAIL_W } from './metrics';

const STORAGE_KEY = 'gitlumiere.panels';

export const RAIL_MIN = 140;
export const RAIL_MAX = 340;
export const DETAIL_MIN = 200;
export const DETAIL_MAX = 520;

/**
 * Width of the rail while it is collapsed.
 *
 * Wide enough for a glyph and its focus ring and nothing else, which is the
 * point: a collapsed rail that still fits a short label is a narrow rail, not a
 * collapsed one.
 */
export const RAIL_COLLAPSED_W = 48;

let rail = $state(RAIL_W);
let detail = $state(DETAIL_W);
/**
 * Collapsed to icons.
 *
 * Kept beside the widths rather than in the rail component because `--rail-w`
 * is what every other component lays itself out against — collapsing has to
 * change that one number, or the graph would keep a rail-shaped hole beside a
 * rail that is no longer there.
 */
let railCollapsed = $state(false);

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(Math.round(value), min), max);
}

function publish() {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	root.style.setProperty('--rail-w', `${railCollapsed ? RAIL_COLLAPSED_W : rail}px`);
	root.style.setProperty('--detail-w', `${detail}px`);
}

function save() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ rail, detail, railCollapsed }));
	} catch {
		// Storage unavailable; widths just won't survive a restart.
	}
}

export const panels = {
	get rail(): number {
		return rail;
	},
	get detail(): number {
		return detail;
	},

	/** True while the rail is a strip of icons. */
	get railCollapsed(): boolean {
		return railCollapsed;
	},

	/**
	 * Collapse or expand the rail.
	 *
	 * The dragged width is kept rather than reset: expanding returns the rail
	 * the user had, which is the difference between a collapse and a reset.
	 */
	toggleRail() {
		railCollapsed = !railCollapsed;
		publish();
		save();
	},

	setRail(width: number) {
		rail = clamp(width, RAIL_MIN, RAIL_MAX);
		publish();
	},

	setDetail(width: number) {
		detail = clamp(width, DETAIL_MIN, DETAIL_MAX);
		publish();
	},

	/** Back to the widths the design specifies. */
	reset() {
		rail = RAIL_W;
		detail = DETAIL_W;
		railCollapsed = false;
		publish();
		save();
	},

	/** Called once a drag ends, so we write storage once instead of per pixel. */
	commit() {
		save();
	},

	init() {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as {
					rail?: number;
					detail?: number;
					railCollapsed?: boolean;
				};
				if (typeof parsed.railCollapsed === 'boolean') railCollapsed = parsed.railCollapsed;
				if (typeof parsed.rail === 'number') rail = clamp(parsed.rail, RAIL_MIN, RAIL_MAX);
				if (typeof parsed.detail === 'number') {
					detail = clamp(parsed.detail, DETAIL_MIN, DETAIL_MAX);
				}
			}
		} catch {
			// Corrupt or unreadable; the defaults are fine.
		}
		publish();
	}
};
