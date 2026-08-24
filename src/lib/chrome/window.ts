// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Window controls for our own decorations.
 *
 * The window is created with `decorations: false`, so the platform draws no
 * title bar and Spagitty draws its own — the 30px bar from the design, with its
 * traffic lights. That means we also own what the platform used to provide:
 * dragging, resizing, and the close/minimize/maximize buttons.
 *
 * Everything here degrades to a no-op outside Tauri, so the UI still runs in a
 * plain browser during frontend work.
 */

import { inTauri } from '$lib/api';

/** Mirrors `ResizeDirection` in @tauri-apps/api, which is a string union. */
export type ResizeEdge =
	| 'North'
	| 'NorthEast'
	| 'East'
	| 'SouthEast'
	| 'South'
	| 'SouthWest'
	| 'West'
	| 'NorthWest';

async function currentWindow() {
	if (!inTauri()) return null;
	const { getCurrentWindow } = await import('@tauri-apps/api/window');
	return getCurrentWindow();
}

export const appWindow = {
	async close(): Promise<void> {
		(await currentWindow())?.close();
	},

	async minimize(): Promise<void> {
		(await currentWindow())?.minimize();
	},

	async toggleMaximize(): Promise<void> {
		(await currentWindow())?.toggleMaximize();
	},

	async isMaximized(): Promise<boolean> {
		return (await currentWindow())?.isMaximized() ?? false;
	},

	/**
	 * Publish whether the window is maximized, as `data-window` on the root
	 * element (FEAT-037).
	 *
	 * The window draws its own corner, edge and shadow, and none of those belong
	 * on a maximized window: a floating card with a gap around it is a window
	 * that does not fit its own screen. CSS cannot ask Tauri, so the answer is
	 * put where CSS can read it.
	 *
	 * Returns an unsubscribe function, or a no-op outside Tauri.
	 */
	async watchMaximized(): Promise<() => void> {
		if (typeof document === 'undefined') return () => {};

		const apply = (maximized: boolean) => {
			document.documentElement.dataset.window = maximized ? 'maximized' : 'floating';
		};

		const window_ = await currentWindow();
		if (!window_) {
			// In a plain browser there is no window to maximize, and a card with
			// a shadow is the honest thing to draw.
			apply(false);
			return () => {};
		}

		apply(await window_.isMaximized());
		return await window_.onResized(async () => apply(await window_.isMaximized()));
	},

	/** Begin a move. Used by the title bar's empty space. */
	async startDragging(): Promise<void> {
		(await currentWindow())?.startDragging();
	},

	/**
	 * Begin a resize from one edge or corner. Without decorations the
	 * compositor no longer offers resize edges, so the window supplies its own.
	 */
	async startResize(edge: ResizeEdge): Promise<void> {
		await (await currentWindow())?.startResizeDragging(edge);
	}
};
