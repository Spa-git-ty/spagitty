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

import { CHANGES_FILES_W, DETAIL_W, DIFF_FILES_W, RAIL_W, REQUESTS_DETAIL_W } from './metrics';

const STORAGE_KEY = 'gitlumiere.panels';

export const RAIL_MIN = 140;
export const RAIL_MAX = 340;
export const DETAIL_MIN = 200;
export const DETAIL_MAX = 520;

/**
 * Every resizable panel, by key (FEAT-037).
 *
 * Until this existed only the rail and the graph's detail panel could be
 * dragged. Every other screen with a side panel — Stash, Working copy, Diff,
 * Pull requests — published a width as a CSS variable and then gave nobody a
 * way to change it, which reads as an oversight rather than a decision.
 *
 * `side` is which edge the panel is anchored to, and it is the whole difference
 * between the two drag directions: a left panel widens as the pointer moves
 * right, a right panel widens as it moves left.
 */
export interface PanelSpec {
	/** The CSS custom property the width is published as. */
	variable: string;
	side: 'left' | 'right';
	initial: number;
	min: number;
	max: number;
}

export const PANELS = {
	rail: { variable: 'rail-w', side: 'left', initial: RAIL_W, min: RAIL_MIN, max: RAIL_MAX },
	detail: {
		variable: 'detail-w',
		side: 'right',
		initial: DETAIL_W,
		min: DETAIL_MIN,
		max: DETAIL_MAX
	},
	requestsDetail: {
		variable: 'requests-detail-w',
		side: 'right',
		initial: REQUESTS_DETAIL_W,
		min: 220,
		max: 560
	},
	changesFiles: {
		variable: 'changes-files-w',
		side: 'left',
		initial: CHANGES_FILES_W,
		min: 160,
		max: 480
	},
	diffFiles: {
		variable: 'diff-files-w',
		side: 'left',
		initial: DIFF_FILES_W,
		min: 140,
		max: 440
	}
} as const satisfies Record<string, PanelSpec>;

export type PanelKey = keyof typeof PANELS;

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
/** The panels added by FEAT-037, which have no reason to be named individually. */
let extra = $state<Record<string, number>>({
	requestsDetail: REQUESTS_DETAIL_W,
	changesFiles: CHANGES_FILES_W,
	diffFiles: DIFF_FILES_W
});
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
	for (const [key, value] of Object.entries(extra)) {
		const spec = PANELS[key as PanelKey];
		if (spec) root.style.setProperty(`--${spec.variable}`, `${value}px`);
	}
}

function save() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ rail, detail, railCollapsed, ...extra }));
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

	/** The current width of any panel, by key. */
	size(key: PanelKey): number {
		if (key === 'rail') return rail;
		if (key === 'detail') return detail;
		return extra[key] ?? PANELS[key].initial;
	},

	/** Set any panel's width, clamped to what it can still be useful at. */
	set(key: PanelKey, width: number) {
		const spec = PANELS[key];
		if (key === 'rail') rail = clamp(width, spec.min, spec.max);
		else if (key === 'detail') detail = clamp(width, spec.min, spec.max);
		else extra = { ...extra, [key]: clamp(width, spec.min, spec.max) };
		publish();
	},

	/** Back to the widths the design specifies. */
	reset() {
		rail = RAIL_W;
		detail = DETAIL_W;
		extra = {
			requestsDetail: REQUESTS_DETAIL_W,
			changesFiles: CHANGES_FILES_W,
			diffFiles: DIFF_FILES_W
		};
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
				const parsed = JSON.parse(stored) as Record<string, unknown>;
				if (typeof parsed.railCollapsed === 'boolean') railCollapsed = parsed.railCollapsed;
				if (typeof parsed.rail === 'number') rail = clamp(parsed.rail, RAIL_MIN, RAIL_MAX);
				if (typeof parsed.detail === 'number') {
					detail = clamp(parsed.detail, DETAIL_MIN, DETAIL_MAX);
				}
				// A width stored before this panel existed is simply absent, and
				// the default stands — no migration, and no version to bump.
				const restored = { ...extra };
				for (const key of Object.keys(restored) as PanelKey[]) {
					const value = parsed[key];
					if (typeof value === 'number') {
						restored[key] = clamp(value, PANELS[key].min, PANELS[key].max);
					}
				}
				extra = restored;
			}
		} catch {
			// Corrupt or unreadable; the defaults are fine.
		}
		publish();
	}
};
