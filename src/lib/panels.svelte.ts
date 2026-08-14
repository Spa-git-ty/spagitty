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

const STORAGE_KEY = 'gitlord.panels';

export const RAIL_MIN = 140;
export const RAIL_MAX = 340;
export const DETAIL_MIN = 200;
export const DETAIL_MAX = 520;

let rail = $state(RAIL_W);
let detail = $state(DETAIL_W);

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(Math.round(value), min), max);
}

function publish() {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	root.style.setProperty('--rail-w', `${rail}px`);
	root.style.setProperty('--detail-w', `${detail}px`);
}

function save() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ rail, detail }));
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
				const parsed = JSON.parse(stored) as { rail?: number; detail?: number };
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
